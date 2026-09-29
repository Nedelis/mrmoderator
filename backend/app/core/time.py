from datetime import datetime, timezone


def utcnow() -> datetime:
    """
    Naive UTC.
    Используется для сравнения с датами из SQLite
    (SQLite хранит naive UTC, потому что не поддерживает tzinfo).
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
