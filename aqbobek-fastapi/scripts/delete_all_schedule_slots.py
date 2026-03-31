"""Delete all ScheduleSlot rows. Run once to reset bad seed data: cd aqbobek-fastapi && PYTHONPATH=. python3 scripts/delete_all_schedule_slots.py"""

from database.connection import SessionLocal
from database.models import ScheduleSlot


def main() -> None:
    db = SessionLocal()
    try:
        deleted = db.query(ScheduleSlot).delete()
        db.commit()
        print(f"Deleted {deleted} slots")
    finally:
        db.close()


if __name__ == "__main__":
    main()
