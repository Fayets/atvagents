from pydantic import BaseModel


class AccountInfo(BaseModel):
    id: str
    nombre: str


class GenerateRequest(BaseModel):
    agent: str
    account_id: str
    lead_context: str = ""
    session_id: str | None = None


class GenerateResponse(BaseModel):
    reply: str
    logs: list[str]
    duration_ms: int
    session_id: str
