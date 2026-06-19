from fastapi import APIRouter, HTTPException
from pony.orm import db_session

from src.schemas import LeadCreate, LeadResponse, MensajeResponse
from src.services.leads_services import LeadsServices

router = APIRouter(prefix="/api/leads")
service = LeadsServices()


def _lead_to_response(lead, include_messages: bool = False) -> LeadResponse:
    mensajes = None
    if include_messages:
        mensajes = [
            MensajeResponse(
                id=msg.id,
                role=msg.role,
                contenido=msg.contenido,
                logs=msg.logs,
                creado=msg.creado,
            )
            for msg in sorted(lead.mensajes, key=lambda m: m.creado)
        ]

    return LeadResponse(
        id=lead.id,
        agent=lead.agent,
        nombre=lead.nombre,
        session_id=lead.session_id,
        fase=lead.fase or 0,
        creado=lead.creado,
        actualizado=lead.actualizado,
        mensajes=mensajes,
    )


@router.get("", response_model=list[LeadResponse])
def list_leads(agent: str):
    try:
        leads = service.list_by_agent(agent)
        return [_lead_to_response(lead) for lead in leads]
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al listar leads.")


@router.post("", response_model=LeadResponse)
def create_lead(body: LeadCreate):
    if not body.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre del lead es obligatorio.")

    try:
        lead = service.create(body.agent, body.nombre)
        return _lead_to_response(lead)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al crear el lead.")


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int):
    try:
        with db_session:
            lead = service.get_with_messages(lead_id)
            if lead is None:
                raise HTTPException(status_code=404, detail=f"No existe el lead {lead_id}.")
            return _lead_to_response(lead, include_messages=True)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al obtener el lead.")
