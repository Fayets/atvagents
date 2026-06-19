from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.schemas import AccountInfo, GenerateResponse
from src.services.claude_runner_services import ClaudeRunnerServices

router = APIRouter(prefix="/api")
service = ClaudeRunnerServices()

ALLOWED_IMAGE_TYPES = frozenset({"image/png", "image/jpeg", "image/webp"})
MAX_IMAGES = 6


@router.get("/accounts", response_model=list[AccountInfo])
def list_accounts():
    try:
        return service.list_accounts()
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error al listar cuentas.")


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    agent: str = Form(...),
    account_id: str = Form(...),
    lead_context: str = Form(""),
    session_id: str | None = Form(None),
    images: list[UploadFile] = File(default=[]),
):
    uploads = [img for img in images if img.filename]

    if not lead_context.strip() and not uploads:
        raise HTTPException(status_code=400, detail="Necesitás texto o al menos una captura.")

    if len(uploads) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail="Máximo 6 capturas por consulta.")

    for image in uploads:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de imagen no permitido: {image.content_type or 'desconocido'}.",
            )

    try:
        return await service.run_generation(
            agent=agent,
            account_id=account_id,
            lead_context=lead_context,
            session_id=session_id or None,
            images=uploads or None,
        )
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al generar.")
