# YaYa

YaYa is a relationship-native virtual human prototype.

It does not start from a preset role menu. It grows a personalized digital human from user-authorized relational data such as exported WeChat or Discord conversations.

## Core Idea

The product pipeline is:

1. Ingest user-authorized conversation data.
2. Extract relational style, tone, care patterns, initiative habits, and recurring concerns.
3. Generate a digital human persona grounded in those extracted signals.
4. Configure or generate a matching lightweight avatar.
5. Run real-time interaction with memory, proactive check-ins, and familiar, data-grounded behavior.

## Product Principles

- YaYa is not a generic assistant.
- YaYa is not a therapist or medical product.
- YaYa is not primarily driven by fixed roles such as mother, father, wife, or grandmother.
- Optional labels may exist as weak hints, but personality and behavior must come primarily from user-authorized data.
- Meaningful behavior should be traceable to source conversations, extracted style features, or explicit user preferences.

## Prototype Goal

Build a hackathon demo that proves one core claim:

`A virtual human can feel emotionally familiar because it is grown from relational data, not hand-authored from a role template.`

## Prototype Scope

For the hackathon prototype, YaYa should support:

- Chat data upload and parsing
- Relational pattern extraction
- Persona card generation
- Lightweight avatar setup
- Real-time text and voice interaction
- Persistent memory
- Proactive check-in generation

## Model Constraints

This prototype is intentionally locked to this runtime split:

- `MiniMax M2.7` for the core brain
- `Gemini TTS` as the single speech path for v1
- `Imagen 4` for static avatar assets
- `Lyria 3 Clip` for ambient mood loops
- `OpenClaw` for channels, tools, skills, and task execution

Optional later enhancement:

- Gemini native image generation may be added later for dynamic per-turn expression updates, but it is not required in v1.

## Runtime Boundary

OpenClaw should be treated as the operating shell around YaYa, not as YaYa's core intelligence provider.

- OpenClaw handles channel integration, skills/tools runtime, messaging surfaces, and dashboard concerns.
- The YaYa backend handles MiniMax API calls, relational analysis, persona generation, memory, and realtime dialogue logic.
- The frontend or OpenClaw layer should forward requests to the YaYa backend instead of calling MiniMax through an OpenClaw provider path.

## Import Tooling

YaYa now supports the output formats produced by these upstream tools in the history-import layer:

- [`DiscordChatExporter`](https://github.com/Tyrrrz/DiscordChatExporter): `Json`, `Csv`, `PlainText`
- [`WeChatHistory`](https://github.com/cxun/WeChatHistory): SQLite history database files (`.db`, `.sqlite`, `.sqlite3`)

Important boundary:

- Historical exports are imported into YaYa first.
- OpenClaw is reserved for Discord realtime relay and execution shell work.
- WeChat remains a history source, not a realtime channel.

Examples:

- DiscordChatExporter JSON/CSV can be pasted, uploaded, or normalized from a local file path.
- WeChatHistory SQLite databases are normalized through the backend file-import endpoint:
  - `PUT /api/import`
  - body example:

```json
{
  "source": "wechat",
  "filePath": "C:\\\\path\\\\to\\\\wechat\\\\MM.sqlite",
  "contactName": "Mom"
}
```

## Environment Setup

Web app:

- copy [`.env.example`](C:\Users\12392\Desktop\YaYa\.env.example) to `.env.local`
- set `YAYA_BACKEND_URL=http://localhost:8787`

YaYa backend:

- copy [`services/yaya-backend/.env.example`](C:\Users\12392\Desktop\YaYa\services\yaya-backend\.env.example) to `services/yaya-backend/.env`
- set `MINIMAX_API_KEY=...`
- keep `MINIMAX_TEXT_MODEL=MiniMax-M2.7` unless your account exposes a different exact model id
- keep `GEMINI_SPEECH_MODE=tts` in v1 so there is only one voice path
- optionally tune `GEMINI_TTS_VOICE_NAME` and `GEMINI_TTS_SAMPLE_RATE_HZ` for the Gemini TTS adapter
- optionally set `OPENCLAW_SHARED_SECRET` before wiring OpenClaw

Local run order:

- `npm run dev:agent`
- `npm run dev:backend`
- `npm run dev:web`

Local privileged agent:

- the local agent is the future OpenClaw-style permission layer for reading local export folders and WeChatHistory databases
- see [Local Agent Architecture](C:\Users\12392\Desktop\YaYa\docs\local-agent-architecture.md)

## Deployment

For a simple demo deployment, use Docker Compose from the project root:

- `docker compose up --build -d`

That starts:

- web on `3000`
- backend on `8787`

See [Deployment Guide](C:\Users\12392\Desktop\YaYa\docs\deployment.md) for the full setup.

## Recommended Docs

- [Product Spec](C:\Users\12392\Desktop\YaYa\docs\product-spec.md)
- [System Architecture](C:\Users\12392\Desktop\YaYa\docs\system-architecture.md)
- [OpenClaw Integration](C:\Users\12392\Desktop\YaYa\docs\openclaw-integration.md)
- [OpenClaw Local Setup](C:\Users\12392\Desktop\YaYa\docs\openclaw-local-setup.md)

## Project Layout

- `app/`: Next.js dashboard and demo UI
- `app/api/`: proxy routes that forward to the YaYa backend
- `services/yaya-backend/`: standalone backend service that calls MiniMax directly
- `docs/`: product and architecture notes
