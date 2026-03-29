# YaYa Local Agent

`YaYa Local Agent` is the privileged local companion service for filesystem-level chat import.

It exists because a browser-only frontend cannot directly scan:

- local Discord export folders
- local WeChatHistory database files
- local desktop app data directories

## Responsibility

- scan common local directories for Discord export files
- scan common local directories for WeChatHistory databases
- execute local `DiscordChatExporter` CLI commands
- expose local-only HTTP endpoints for the YaYa app

## Boundary

- local agent: permissions, scanning, local command execution
- YaYa backend: normalize, analysis, persona, avatar, session storage
- OpenClaw: realtime Discord relay and execution shell

## Endpoints

- `GET /health`
- `GET /v1/scan/discord-exports`
- `GET /v1/scan/wechat-dbs`
- `POST /v1/discord/export`

## Next Step

The current implementation is the privileged service skeleton.
The next product step is wiring the setup page to call this agent so users can authorize and select detected local sources without manual upload.
