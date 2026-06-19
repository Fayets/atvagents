from datetime import datetime

from pydantic import BaseModel


class AccountInfo(BaseModel):
    id: str
    nombre: str


class GenerateRequest(BaseModel):
    agent: str
    account_id: str
    lead_id: int
    lead_context: str = ""
    session_id: str | None = None


class GenerateResponse(BaseModel):
    reply: str
    logs: list[str]
    duration_ms: int
    session_id: str


class LeadCreate(BaseModel):
    agent: str
    nombre: str


class MensajeResponse(BaseModel):
    id: int
    role: str
    contenido: str
    logs: list[str] | None = None
    creado: datetime


class LeadResponse(BaseModel):
    id: int
    agent: str
    nombre: str
    session_id: str | None = None
    fase: int
    creado: datetime
    actualizado: datetime
    mensajes: list[MensajeResponse] | None = None


class TranscriptCreate(BaseModel):
    agent: str
    titulo: str
    contenido: str


class TranscriptResponse(BaseModel):
    id: int
    agent: str
    titulo: str
    contenido: str
    palabras: int
    creado: datetime
