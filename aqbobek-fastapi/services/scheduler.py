import uuid

from ortools.sat.python import cp_model
from sqlalchemy.orm import Session

from database.models import Class, ScheduleSlot, TeacherProfile
from utils.date_utils import date_to_iso_weekday


SUBJECTS = ["Математика", "Физика", "Информатика", "История", "Биология"]
TIME_SLOTS = list(range(1, 7))  # 1..6
ROOMS = ["101", "102", "103", "104", "105"]


def _get_subject_teacher_map(db: Session) -> dict[str, str]:
    """Returns {subject: teacher_profile_id}"""
    teachers = db.query(TeacherProfile).all()
    result: dict[str, str] = {}
    for t in teachers:
        for subj in t.subjects or []:
            if subj in SUBJECTS and subj not in result:
                result[subj] = t.id
    return result


def generate_schedule(
    class_ids: list[str],
    date: str,
    db: Session,
) -> dict:
    try:
        day_of_week = date_to_iso_weekday(date)
    except ValueError as e:
        return {
            "schedule": [],
            "message": str(e),
            "conflicts": ["Выберите рабочий день (Пн-Пт)"],
        }

    classes = db.query(Class).filter(Class.id.in_(class_ids)).all()
    if not classes:
        return {
            "schedule": [],
            "message": "Классы не найдены",
            "conflicts": [],
        }

    subject_teacher = _get_subject_teacher_map(db)

    model = cp_model.CpModel()

    n_classes = len(classes)
    n_subjects = len(SUBJECTS)

    x: dict[tuple[int, int, int], cp_model.IntVar] = {}
    for ci in range(n_classes):
        for si in range(n_subjects):
            for slot in TIME_SLOTS:
                x[ci, si, slot] = model.new_bool_var(f"x_c{ci}_s{si}_t{slot}")

    # C1: each class gets exactly 1 lesson per subject
    for ci in range(n_classes):
        for si in range(n_subjects):
            model.add_exactly_one(x[ci, si, slot] for slot in TIME_SLOTS)

    # C2: each class has at most 1 lesson per slot
    for ci in range(n_classes):
        for slot in TIME_SLOTS:
            model.add_at_most_one(x[ci, si, slot] for si in range(n_subjects))

    # C3: same teacher cannot teach two classes at same slot
    for si, subject in enumerate(SUBJECTS):
        if subject not in subject_teacher:
            continue
        for slot in TIME_SLOTS:
            model.add(sum(x[ci, si, slot] for ci in range(n_classes)) <= 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 15.0
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "schedule": [],
            "message": "CP-SAT не нашёл решения. Проверьте данные.",
            "conflicts": ["Возможно не хватает учителей или слотов"],
        }

    db.query(ScheduleSlot).filter(
        ScheduleSlot.class_id.in_(class_ids),
        ScheduleSlot.day_of_week == day_of_week,
    ).delete(synchronize_session=False)
    db.commit()

    new_slots: list[dict] = []

    for ci, cls in enumerate(classes):
        for si, subject in enumerate(SUBJECTS):
            for slot in TIME_SLOTS:
                if not solver.boolean_value(x[ci, si, slot]):
                    continue
                room = ROOMS[(ci * 2 + si) % len(ROOMS)]

                teacher_id = subject_teacher.get(subject)
                db_slot = ScheduleSlot(
                    id=str(uuid.uuid4()),
                    class_id=cls.id,
                    teacher_id=teacher_id,
                    subject=subject,
                    room=room,
                    day_of_week=day_of_week,
                    time_slot=slot,
                    is_active=True,
                )
                db.add(db_slot)
                new_slots.append(
                    {
                        "id": db_slot.id,
                        "classId": cls.id,
                        "className": cls.name,
                        "subject": subject,
                        "teacherId": teacher_id or "",
                        "room": room,
                        "dayOfWeek": day_of_week,
                        "timeSlot": slot,
                    }
                )

    db.commit()
    print(f"[scheduler] Расписание сохранено: {len(new_slots)} уроков, dayOfWeek={day_of_week}")

    return {
        "schedule": new_slots,
        "message": f"Расписание сохранено: {len(new_slots)} уроков",
        "conflicts": [],
    }


def handle_substitution(
    original_teacher_id: str,
    date: str,
    reason: str,
    db: Session,
) -> dict:
    try:
        day_of_week = date_to_iso_weekday(date)
    except ValueError as e:
        return {
            "updatedSlots": [],
            "diff": [str(e)],
            "message": str(e),
            "substituteTeacherId": None,
        }

    affected = (
        db.query(ScheduleSlot)
        .filter(
            ScheduleSlot.teacher_id == original_teacher_id,
            ScheduleSlot.day_of_week == day_of_week,
            ScheduleSlot.is_active == True,  # noqa: E712
        )
        .all()
    )

    if not affected:
        return {
            "updatedSlots": [],
            "diff": ["У этого учителя нет уроков в этот день"],
            "message": "Замена не требуется",
            "substituteTeacherId": None,
        }

    absent = db.query(TeacherProfile).get(original_teacher_id)
    print(f"[SUB] Absent teacher {original_teacher_id} subjects: {absent.subjects if absent else None}")

    busy_slots = {s.time_slot for s in affected}
    substitute_id: str | None = None

    candidates = (
        db.query(TeacherProfile)
        .filter(TeacherProfile.id != original_teacher_id)
        .all()
    )

    absent_subject = (absent.subjects or [None])[0] if absent else None

    for candidate in candidates:
        cand_subjects = candidate.subjects or []

        # Must teach same subject — no cross-subject substitution
        if absent_subject and absent_subject not in cand_subjects:
            continue

        conflicts = (
            db.query(ScheduleSlot)
            .filter(
                ScheduleSlot.teacher_id == candidate.id,
                ScheduleSlot.day_of_week == day_of_week,
                ScheduleSlot.time_slot.in_(list(busy_slots)),
                ScheduleSlot.is_active == True,  # noqa: E712
            )
            .count()
        )

        if conflicts == 0:
            substitute_id = candidate.id
            break

    # If no same-subject teacher found — do not assign wrong teacher
    # Just report as unresolved
    if not substitute_id:
        return {
            "updatedSlots": [],
            "diff": [
                f"Нет свободного учителя по предмету {absent_subject}"
            ],
            "message": (
                f"Замена не найдена: нет свободного учителя "
                f"по предмету {absent_subject}. "
                f"Назначьте замену вручную."
            ),
            "substituteTeacherId": None,
        }

    diff: list[str] = []
    updated: list[dict] = []
    for slot in affected:
        status_text = "замена назначена"
        diff.append(f"Урок {slot.time_slot}: {slot.subject} — {status_text}")
        updated.append(
            {
                "id": slot.id,
                "classId": slot.class_id,
                "subject": slot.subject,
                "room": slot.room,
                "timeSlot": slot.time_slot,
                "dayOfWeek": slot.day_of_week,
                "originalTeacherId": original_teacher_id,
                "substituteTeacherId": substitute_id,
            }
        )

    msg = f"Обработано {len(affected)} уроков. Замена назначена."
    return {
        "updatedSlots": updated,
        "diff": diff,
        "message": msg,
        "substituteTeacherId": substitute_id,
    }
