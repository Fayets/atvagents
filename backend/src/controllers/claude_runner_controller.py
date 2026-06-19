from fastapi import APIRouter, HTTPException

from src.schemas import AccountInfo, GenerateRequest, GenerateResponse
from src.services.claude_runner_services import ClaudeRunnerServices

router = APIRouter(prefix="/api")
service = ClaudeRunnerServices()


@router.get("/accounts", response_model=list[AccountInfo])
def list_accounts():
    try:
        return service.list_accounts()
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al listar cuentas.")


@router.post("/generate", response_model=GenerateResponse)
def generate(body: GenerateRequest):
    try:
        return service.run_generation(
            agent=body.agent,
            account_id=body.account_id,
            lead_context=body.lead_context,
            session_id=body.session_id,
        )
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al generar.")
