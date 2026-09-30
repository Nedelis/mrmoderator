"""Модуль для сидинга БД тестовыми данными"""

from seed.seed import clear_db, cli, is_db_empty, main, seed

__all__ = ["is_db_empty", "clear_db", "seed", "main", "cli"]
