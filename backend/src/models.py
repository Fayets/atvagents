from datetime import datetime

from pony.orm import Json, LongStr, Optional, PrimaryKey, Required, Set

from src.db import db


class Lead(db.Entity):
    id = PrimaryKey(int, auto=True)
    agent = Required(str)
    nombre = Required(str)
    session_id = Optional(str)
    fase = Optional(int, default=0)
    creado = Required(datetime, default=lambda: datetime.now())
    actualizado = Required(datetime, default=lambda: datetime.now())
    mensajes = Set("Mensaje")


class Mensaje(db.Entity):
    id = PrimaryKey(int, auto=True)
    lead = Required(Lead)
    role = Required(str)
    contenido = Required(LongStr)
    logs = Optional(Json)
    creado = Required(datetime, default=lambda: datetime.now())


class Transcript(db.Entity):
    id = PrimaryKey(int, auto=True)
    agent = Required(str)
    titulo = Required(str)
    contenido = Required(LongStr)
    palabras = Required(int)
    creado = Required(datetime, default=lambda: datetime.now())
