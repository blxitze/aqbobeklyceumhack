import datetime


def date_to_iso_weekday(date_str: str) -> int:
    """
    Returns ISO weekday: 1=Monday, 2=Tuesday, ... 5=Friday
    Raises ValueError if weekend.
    """
    d = datetime.date.fromisoformat(date_str)
    dow = d.isoweekday()
    if dow > 5:
        raise ValueError(f"{date_str} is a weekend")
    return dow
