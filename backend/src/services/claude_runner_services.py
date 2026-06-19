import asyncio
import json
import logging
import os
import shutil
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile

from src.schemas import AccountInfo
from src.services.leads_services import LeadsServices

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ACCOUNTS_DIR = BACKEND_ROOT / "accounts"
CONTENT_DIR = BACKEND_ROOT / "content"
PROCESS_TIMEOUT_SECONDS = 120

ALLOWED_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}

GENERIC_AGENT_ERROR = (
    "Error al ejecutar el agente. Revisá que la cuenta esté logueada correctamente."
)


@dataclass
class GenerationRun:
    command: list[str]
    cwd: str
    env: dict[str, str]
    lead_id: int
    user_content: str = ""


class ClaudeRunnerServices:
    def __init__(self) -> None:
        self.leads_service = LeadsServices()
    def list_accounts(self) -> list[AccountInfo]:
        if not ACCOUNTS_DIR.is_dir():
            return []

        accounts: list[AccountInfo] = []
        for entry in sorted(ACCOUNTS_DIR.iterdir()):
            if not entry.is_dir() or entry.name.startswith("."):
                continue
            accounts.append(
                AccountInfo(
                    id=entry.name,
                    nombre=entry.name.capitalize(),
                )
            )
        return accounts

    async def prepare_generation(
        self,
        agent: str,
        account_id: str,
        lead_id: int,
        lead_context: str,
        session_id: str | None = None,
        images: list[UploadFile] | None = None,
    ) -> GenerationRun:
        agent_dir = CONTENT_DIR / agent
        if not agent_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"No existe el agente '{agent}'.")

        account_dir = ACCOUNTS_DIR / account_id
        if not account_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"No existe la cuenta '{account_id}'.")

        if not shutil.which("claude"):
            logger.error("claude binary not found in PATH")
            raise HTTPException(status_code=500, detail=GENERIC_AGENT_ERROR)

        final_context = await self._build_lead_context(agent_dir, lead_context, images)

        env = os.environ.copy()
        env["CLAUDE_CONFIG_DIR"] = str(account_dir.resolve())

        return GenerationRun(
            command=self._build_command(final_context, session_id),
            cwd=str(agent_dir.resolve()),
            env=env,
            lead_id=lead_id,
            user_content=lead_context,
        )

    async def stream_generation(self, run: GenerationRun) -> AsyncIterator[str]:
        started = time.time()
        session_id: str | None = None
        text_chunks_received = False
        seen_logs: set[str] = set()
        accumulated_text = ""
        log_lines: list[str] = []

        try:
            process = await asyncio.create_subprocess_exec(
                *run.command,
                cwd=run.cwd,
                env=run.env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError:
            logger.error("claude binary not found in PATH")
            yield self._sse({"type": "error", "detail": GENERIC_AGENT_ERROR})
            return

        try:
            async with asyncio.timeout(PROCESS_TIMEOUT_SECONDS):
                assert process.stdout is not None
                while True:
                    raw_line = await process.stdout.readline()
                    if not raw_line:
                        break

                    line = raw_line.decode(errors="replace").strip()
                    if not line:
                        continue

                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    event_session_id = event.get("session_id")
                    if isinstance(event_session_id, str) and event_session_id.strip():
                        session_id = event_session_id

                    event_type = event.get("type")

                    if event_type == "result":
                        if event.get("is_error"):
                            logger.error(
                                "claude result error stderr=%s",
                                (await self._read_stderr(process)) if process.stderr else "",
                            )
                            yield self._sse(
                                {
                                    "type": "error",
                                    "detail": GENERIC_AGENT_ERROR,
                                }
                            )
                            await self._terminate_process(process)
                            return

                        result_text = event.get("result")
                        if (
                            isinstance(result_text, str)
                            and result_text.strip()
                            and not text_chunks_received
                        ):
                            text_chunks_received = True
                            accumulated_text += result_text
                            yield self._sse({"type": "text_chunk", "value": result_text})
                        continue

                    for payload in self._events_from_ndjson_event(event):
                        if payload["type"] == "log":
                            if payload["value"] in seen_logs:
                                continue
                            seen_logs.add(payload["value"])
                            log_lines.append(payload["value"])
                        if payload["type"] == "text_chunk":
                            text_chunks_received = True
                            accumulated_text += payload["value"]
                        yield self._sse(payload)

                return_code = await process.wait()
        except TimeoutError:
            logger.error("claude subprocess timed out after %ss", PROCESS_TIMEOUT_SECONDS)
            await self._terminate_process(process)
            yield self._sse(
                {
                    "type": "error",
                    "detail": "El agente tardó demasiado en responder.",
                }
            )
            return

        duration_ms = int((time.time() - started) * 1000)

        if return_code != 0:
            stderr = await self._read_stderr(process)
            logger.error("claude subprocess failed (code=%s) stderr=%s", return_code, stderr)
            yield self._sse({"type": "error", "detail": GENERIC_AGENT_ERROR})
            return

        if not session_id:
            logger.error("No session_id found in claude stream")
            yield self._sse({"type": "error", "detail": GENERIC_AGENT_ERROR})
            return

        if not text_chunks_received:
            logger.error("No text chunks received from claude stream")
            yield self._sse({"type": "error", "detail": GENERIC_AGENT_ERROR})
            return

        try:
            self.leads_service.save_generation_result(
                lead_id=run.lead_id,
                user_content=run.user_content,
                assistant_content=accumulated_text,
                logs=log_lines,
                session_id=session_id,
            )
        except Exception:
            logger.exception("Failed to persist generation result for lead %s", run.lead_id)

        yield self._sse(
            {
                "type": "done",
                "session_id": session_id,
                "duration_ms": duration_ms,
            }
        )

    async def _build_lead_context(
        self,
        agent_dir: Path,
        lead_context: str,
        images: list[UploadFile] | None,
    ) -> str:
        saved_paths: list[str] = []
        uploads = images or []

        if uploads:
            upload_dir = agent_dir / "uploads" / str(int(time.time() * 1000))
            upload_dir.mkdir(parents=True, exist_ok=True)

            for index, image in enumerate(uploads, start=1):
                ext = ALLOWED_IMAGE_EXTENSIONS.get(image.content_type or "")
                if not ext:
                    ext = Path(image.filename or "").suffix.lower() or ".png"
                filename = f"captura_{index}{ext}"
                dest = upload_dir / filename
                dest.write_bytes(await image.read())
                saved_paths.append(str(dest.resolve()))

        parts: list[str] = []
        text = lead_context.strip()
        if text:
            parts.append(text)
        if saved_paths:
            paths_line = ", ".join(saved_paths)
            parts.append(
                "Tenés capturas de la conversación adjuntas en estas rutas, "
                f"leelas con la herramienta Read antes de responder: {paths_line}"
            )

        return "\n\n".join(parts)

    @staticmethod
    def _build_command(lead_context: str, session_id: str | None) -> list[str]:
        if session_id:
            return [
                "claude",
                "-p",
                lead_context,
                "--resume",
                session_id,
                "--output-format",
                "stream-json",
                "--verbose",
                "--model",
                "sonnet",
            ]
        return [
            "claude",
            "-p",
            lead_context,
            "--output-format",
            "stream-json",
            "--verbose",
            "--model",
            "sonnet",
        ]

    def _events_from_ndjson_event(self, event: dict) -> list[dict]:
        events: list[dict] = []
        event_type = event.get("type")

        if event_type == "assistant":
            message = event.get("message") or {}
            for block in message.get("content") or []:
                if not isinstance(block, dict):
                    continue
                block_type = block.get("type")
                if block_type == "tool_use":
                    events.append({"type": "log", "value": self._tool_use_to_log(block)})
                elif block_type == "text":
                    text = block.get("text") or ""
                    if text:
                        events.append({"type": "text_chunk", "value": text})

        elif event_type == "tool_use":
            events.append({"type": "log", "value": self._tool_use_to_log(event)})

        elif event_type == "stream_event":
            inner = event.get("event") or {}
            delta = inner.get("delta") or {}
            if delta.get("type") == "text_delta":
                text = delta.get("text") or ""
                if text:
                    events.append({"type": "text_chunk", "value": text})

        return events

    @staticmethod
    def _tool_use_to_log(block: dict) -> str:
        tool_name = block.get("name") or "tool"
        tool_input = block.get("input")

        if isinstance(tool_input, dict):
            for key in ("file_path", "path", "file", "notebook_path"):
                value = tool_input.get(key)
                if isinstance(value, str) and value.strip():
                    return f"Leyendo {Path(value).name}"

        return str(tool_name)

    @staticmethod
    def _sse(payload: dict) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    @staticmethod
    async def _read_stderr(process: asyncio.subprocess.Process) -> str:
        if process.stderr is None:
            return ""
        data = await process.stderr.read()
        return data.decode(errors="replace")

    @staticmethod
    async def _terminate_process(process: asyncio.subprocess.Process) -> None:
        if process.returncode is not None:
            return
        process.kill()
        await process.wait()
