from datetime import datetime

from fastapi import HTTPException
from pony.orm import db_session

from src.models import Transcript


class TranscriptsServices:
    @db_session
    def list_by_agent(self, agent: str) -> list[Transcript]:
        return list(
            Transcript.select(lambda t: t.agent == agent).order_by(Transcript.creado.desc())
        )

    @db_session
    def create(self, agent: str, titulo: str, contenido: str) -> Transcript:
        return Transcript(
            agent=agent,
            titulo=titulo.strip(),
            contenido=contenido,
            palabras=len(contenido.split()),
            creado=datetime.now(),
        )

    @db_session
    def delete(self, transcript_id: int) -> None:
        transcript = Transcript.get(id=transcript_id)
        if transcript is None:
            raise HTTPException(status_code=404, detail=f"No existe el transcript {transcript_id}.")
        transcript.delete()
