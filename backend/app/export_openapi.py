"""
Выгрузка OpenAPI-схемы в YAML.

    python -m app.export_openapi > ../docs/openapi.yaml

В Docker:
    docker compose exec -T api python -m app.export_openapi > docs/openapi.yaml
"""

import sys

import yaml

from app.main import app


def _str_representer(dumper: yaml.SafeDumper, data: str) -> yaml.ScalarNode:
    # Многострочные описания — блоком «|», чтобы файл читался глазами
    style = "|" if "\n" in data else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style=style)


yaml.SafeDumper.add_representer(str, _str_representer)


def main() -> None:
    yaml.safe_dump(
        app.openapi(),
        sys.stdout,
        allow_unicode=True,
        sort_keys=False,
        width=100,
    )


if __name__ == "__main__":
    main()
