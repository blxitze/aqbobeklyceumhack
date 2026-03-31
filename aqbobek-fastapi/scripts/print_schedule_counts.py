"""Print ScheduleSlot counts per dayOfWeek. Run from repo: cd aqbobek-fastapi && PYTHONPATH=. python3 scripts/print_schedule_counts.py"""

from sqlalchemy import func

from database.connection import SessionLocal
from database.models import ScheduleSlot


def main() -> None:
    db = SessionLocal()
    try:
        counts = (
            db.query(ScheduleSlot.day_of_week, func.count(ScheduleSlot.id))
            .group_by(ScheduleSlot.day_of_week)
            .all()
        )
        for day, count in sorted(counts):
            print(f"Day {day}: {count} slots")
        if not counts:
            print("No schedule slots in database.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
