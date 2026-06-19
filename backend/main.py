from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.controllers.claude_runner_controller import router as claude_runner_router

app = FastAPI(title="ATV Pack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(claude_runner_router)
