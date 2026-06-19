import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv
from pony.orm import Database

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

db = Database()


def _bind_from_env() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL no está definida. Copiá .env.template a .env y completá los valores."
        )

    parsed = urlparse(database_url)
    if not parsed.hostname or not parsed.path:
        raise RuntimeError("DATABASE_URL inválida: faltan host o nombre de base de datos.")

    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    host = parsed.hostname or ""
    if parsed.port:
        host = f"{host}:{parsed.port}"
    database = parsed.path.lstrip("/")

    db.bind(
        provider="postgres",
        user=user,
        password=password,
        host=host,
        database=database,
        sslmode="require",
    )


def init_db() -> None:
    _bind_from_env()
    from src import models  # noqa: F401

    db.generate_mapping(create_tables=True)
