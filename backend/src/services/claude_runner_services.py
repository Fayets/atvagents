import json
import logging
import os
import subprocess
import time
from pathlib import Path

from fastapi import HTTPException, UploadFile

from src.schemas import AccountInfo, GenerateResponse

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ACCOUNTS_DIR = BACKEND_ROOT / "accounts"
CONTENT_DIR = BACKEND_ROOT / "content"

ALLOWED_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


class ClaudeRunnerServices:
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

    async def run_generation(
        self,
        agent: str,
        account_id: str,
        lead_context: str,
        session_id: str | None = None,
        images: list[UploadFile] | None = None,
    ) -> GenerateResponse:
        agent_dir = CONTENT_DIR / agent
        if not agent_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"No existe el agente '{agent}'.")

        account_dir = ACCOUNTS_DIR / account_id
        if not account_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"No existe la cuenta '{account_id}'.")

        final_context = await self._build_lead_context(agent_dir, lead_context, images)

        env = os.environ.copy()
        env["CLAUDE_CONFIG_DIR"] = str(account_dir.resolve())

        command = self._build_command(final_context, session_id)

        started = time.time()
        try:
            completed = subprocess.run(
                command,
                cwd=str(agent_dir.resolve()),
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except FileNotFoundError:
            logger.error("claude binary not found in PATH")
            raise HTTPException(
                status_code=500,
                detail="Error al ejecutar el agente. Revisá que la cuenta esté logueada correctamente.",
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="El agente tardó demasiado en responder.")

        duration_ms = int((time.time() - started) * 1000)

        if completed.returncode != 0:
            logger.error(
                "claude subprocess failed (code=%s) stderr=%s",
                completed.returncode,
                completed.stderr,
            )
            raise HTTPException(
                status_code=500,
                detail="Error al ejecutar el agente. Revisá que la cuenta esté logueada correctamente.",
            )

        try:
            reply, logs, parsed_session_id = self._parse_stream_json(completed.stdout)
        except ValueError:
            logger.exception("Failed to parse claude stream-json stdout=%r", completed.stdout[:2000])
            raise HTTPException(
                status_code=500,
                detail="Error al ejecutar el agente. Revisá que la cuenta esté logueada correctamente.",
            )

        if not reply.strip():
            logger.error("Empty reply from claude stdout=%r stderr=%r", completed.stdout[:2000], completed.stderr)
            raise HTTPException(
                status_code=500,
                detail="Error al ejecutar el agente. Revisá que la cuenta esté logueada correctamente.",
            )

        return GenerateResponse(
            reply=reply,
            logs=logs,
            duration_ms=duration_ms,
            session_id=parsed_session_id,
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

    def _parse_stream_json(self, stdout: str) -> tuple[str, list[str], str]:
        """
        Parsea NDJSON de `claude -p ... --output-format stream-json`.

        Formato observado/documentado (Claude Code stream-json):
        - type=assistant: message.content[] con text y/o tool_use
        - type=tool_use: evento top-level (algunas versiones)
        - type=result: campo `result` con la respuesta final (subtype success)
        """
        logs: list[str] = []
        assistant_text_chunks: list[str] = []
        final_result: str | None = None
        session_id: str | None = None
        parsed_any = False

        for raw_line in stdout.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            parsed_any = True
            event_type = event.get("type")

            event_session_id = event.get("session_id")
            if isinstance(event_session_id, str) and event_session_id.strip():
                session_id = event_session_id

            if event_type == "assistant":
                message = event.get("message") or {}
                for block in message.get("content") or []:
                    if not isinstance(block, dict):
                        continue
                    block_type = block.get("type")
                    if block_type == "tool_use":
                        log_line = self._tool_use_to_log(block)
                        if log_line not in logs:
                            logs.append(log_line)
                    elif block_type == "text":
                        text = (block.get("text") or "").strip()
                        if text:
                            assistant_text_chunks.append(text)

            elif event_type == "tool_use":
                log_line = self._tool_use_to_log(event)
                if log_line not in logs:
                    logs.append(log_line)

            elif event_type == "result":
                subtype = event.get("subtype")
                if event.get("is_error"):
                    error_msg = event.get("error") or event.get("result") or "Error desconocido"
                    raise ValueError(f"Claude result error: {error_msg}")
                if subtype in ("success", "completion", None):
                    result_text = event.get("result")
                    if isinstance(result_text, str) and result_text.strip():
                        final_result = result_text

        if not parsed_any:
            raise ValueError("No se encontraron eventos JSON en stdout")

        if not session_id:
            raise ValueError("No se encontró session_id en stdout")

        reply = final_result if final_result is not None else "\n\n".join(assistant_text_chunks)
        return reply.strip(), logs, session_id

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
