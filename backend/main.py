from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.controllers.claude_runner_controller import router as claude_runner_router
from src.controllers.leads_controller import router as leads_router
from src.controllers.transcripts_controller import router as transcripts_router
from src.db import init_db

app = FastAPI(title="ATV Pack API")


@app.on_event("startup")
def on_startup():
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://agents.atvos.io",
        "https://agents.atvos.io",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(claude_runner_router)
app.include_router(leads_router)
app.include_router(transcripts_router)
