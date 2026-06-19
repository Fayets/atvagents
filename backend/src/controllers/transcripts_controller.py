from fastapi import APIRouter, HTTPException

from src.schemas import TranscriptCreate, TranscriptResponse
from src.services.transcripts_services import TranscriptsServices

router = APIRouter(prefix="/api/transcripts")
service = TranscriptsServices()


def _transcript_to_response(transcript) -> TranscriptResponse:
    return TranscriptResponse(
        id=transcript.id,
        agent=transcript.agent,
        titulo=transcript.titulo,
        contenido=transcript.contenido,
        palabras=transcript.palabras,
        creado=transcript.creado,
    )


@router.get("", response_model=list[TranscriptResponse])
def list_transcripts(agent: str):
    try:
        transcripts = service.list_by_agent(agent)
        return [_transcript_to_response(t) for t in transcripts]
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al listar transcripts.")


@router.post("", response_model=TranscriptResponse)
def create_transcript(body: TranscriptCreate):
    if not body.titulo.strip():
        raise HTTPException(status_code=400, detail="El título es obligatorio.")
    if not body.contenido.strip():
        raise HTTPException(status_code=400, detail="El contenido es obligatorio.")

    try:
        transcript = service.create(body.agent, body.titulo, body.contenido)
        return _transcript_to_response(transcript)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al crear el transcript.")


@router.delete("/{transcript_id}")
def delete_transcript(transcript_id: int):
    try:
        service.delete(transcript_id)
        return {"ok": True}
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al eliminar el transcript.")
