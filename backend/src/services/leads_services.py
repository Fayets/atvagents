import re
from datetime import datetime

from fastapi import HTTPException
from pony.orm import db_session

from src.models import Lead, Mensaje


def detect_phase_from_text(text: str) -> int | None:
    if not text:
        return None
    match = re.search(r"fase\s*(\d{1,2})", text, re.IGNORECASE)
    if not match:
        return None
    phase = int(match.group(1))
    if phase < 1 or phase > 10:
        return None
    return phase


class LeadsServices:
    @db_session
    def list_by_agent(self, agent: str) -> list[Lead]:
        return list(Lead.select(lambda l: l.agent == agent).order_by(Lead.actualizado.desc()))

    @db_session
    def create(self, agent: str, nombre: str) -> Lead:
        now = datetime.now()
        return Lead(agent=agent, nombre=nombre.strip(), fase=1, creado=now, actualizado=now)

    @db_session
    def get_with_messages(self, lead_id: int) -> Lead | None:
        return Lead.get(id=lead_id)

    @db_session
    def add_message(
        self,
        lead_id: int,
        role: str,
        contenido: str,
        logs: list[str] | None = None,
    ) -> Mensaje:
        lead = Lead.get(id=lead_id)
        if lead is None:
            raise HTTPException(status_code=404, detail=f"No existe el lead {lead_id}.")

        now = datetime.now()
        lead.actualizado = now
        return Mensaje(
            lead=lead,
            role=role,
            contenido=contenido,
            logs=logs,
            creado=now,
        )

    @db_session
    def update_session(self, lead_id: int, session_id: str, fase: int | None = None) -> Lead:
        lead = Lead.get(id=lead_id)
        if lead is None:
            raise HTTPException(status_code=404, detail=f"No existe el lead {lead_id}.")

        lead.session_id = session_id
        if fase is not None:
            lead.fase = fase
        lead.actualizado = datetime.now()
        return lead

    @db_session
    def save_generation_result(
        self,
        lead_id: int,
        user_content: str,
        assistant_content: str,
        logs: list[str],
        session_id: str,
    ) -> Lead:
        lead = Lead.get(id=lead_id)
        if lead is None:
            raise HTTPException(status_code=404, detail=f"No existe el lead {lead_id}.")

        now = datetime.now()
        trimmed_user = user_content.strip()
        if trimmed_user:
            Mensaje(lead=lead, role="user", contenido=trimmed_user, creado=now)

        Mensaje(
            lead=lead,
            role="assistant",
            contenido=assistant_content,
            logs=logs or None,
            creado=now,
        )

        lead.session_id = session_id
        detected_phase = detect_phase_from_text(assistant_content)
        if detected_phase is not None:
            lead.fase = detected_phase
        lead.actualizado = now
        return lead
