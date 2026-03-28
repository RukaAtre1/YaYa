# YaYa Deployment

## Recommended Demo Deployment

Use one VM or cloud host with Docker and Docker Compose:

- `yaya-web`: Next.js frontend on port `3000`
- `yaya-backend`: Express backend on port `8787`

This keeps the current runtime split intact:

- `MiniMax M2.7` for the main brain
- `Gemini TTS` for the only speech path
- `Imagen 4` as the static avatar asset layer
- `Lyria 3 Clip` as the ambience layer
- `OpenClaw` remains separate from the main reasoning path

## Required Environment

Backend env file:

- [`services/yaya-backend/.env`](C:\Users\12392\Desktop\YaYa\services\yaya-backend\.env)

Minimum required values:

- `MINIMAX_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_SPEECH_MODE=tts`

Recommended values:

- `MINIMAX_TEXT_MODEL=MiniMax-M2.7`
- `GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts`
- `GEMINI_TTS_VOICE_NAME=Kore`
- `IMAGEN_MODEL=imagen-4.0-generate-001`
- `LYRIA_MODEL=Lyria 3 Clip`

The frontend container uses:

- `YAYA_BACKEND_URL=http://yaya-backend:8787`

That value is already wired in [`docker-compose.yml`](C:\Users\12392\Desktop\YaYa\docker-compose.yml).

## Start

From the project root:

```bash
docker compose up --build -d
```

## Stop

```bash
docker compose down
```

## Logs

```bash
docker compose logs -f yaya-backend
docker compose logs -f yaya-web
```

## URLs

- Web UI: `http://<your-host>:3000`
- Backend health: `http://<your-host>:8787/health`

## What Should Work After Deployment

- `/health`
- `/v1/chat`
- `/v1/speech`
- `/v1/expression`
- `/v1/ambience`
- frontend `/chat`

## Deployment Notes

- If `GEMINI_API_KEY` is empty, chat can still work but speech will not.
- `Imagen 4` and `Lyria 3 Clip` remain adapter boundaries in v1; they are not promoted into the blocking chat path.
- OpenClaw bridge can continue to call the backend on port `8787`.
