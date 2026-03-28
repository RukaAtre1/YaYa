# OpenClaw Integration

## Role Of OpenClaw

OpenClaw should act as the runtime shell around YaYa:

- messaging integration
- Discord and other channel surfaces
- skills and tools runtime
- operator dashboard or control surface
- optional containerized deployment layer

It should not be treated as the primary MiniMax intelligence path for this prototype.

## Why This Boundary Exists

There is a known MiniMax provider compatibility issue on the OpenClaw side where the `developer` role can be passed incorrectly and cause MiniMax API failures.

Because of that, the prototype should avoid coupling YaYa's main intelligence loop to OpenClaw's MiniMax provider path.

## Recommended Topology

```text
Discord / Other Channels
          |
          v
       OpenClaw
          |
          v
   YaYa Backend Service
          |
          +----> M2.7
          +----> Gemini TTS
          +----> Imagen 4
          +----> Lyria 3 Clip
          |
          v
     Response To OpenClaw / UI
```

## Responsibility Split

### OpenClaw

- receives channel messages
- runs integration and runtime shell concerns
- forwards relevant user messages to the YaYa backend
- returns YaYa responses back to the channel

### YaYa Backend

- ingests authorized chat data
- extracts relational patterns
- compiles persona and behavior policies
- stores memory
- runs realtime dialogue logic
- calls MiniMax APIs directly

## Current Skeleton

The current codebase reflects this boundary:

- `app/` is the dashboard and demo frontend
- `app/api/` contains proxy routes that call the backend
- `services/yaya-backend/` contains the standalone service and MiniMax integration point

## Suggested Runtime Flow

1. OpenClaw receives a Discord message.
2. OpenClaw forwards a normalized payload to `POST /v1/openclaw/message` on the YaYa backend.
3. The YaYa backend loads persona, memory, and recent history.
4. The YaYa backend calls `M2.7` directly for dialogue, emotion tagging, and action intent generation.
5. The YaYa backend routes speech through `Gemini TTS`, avatar assets through `Imagen 4`, and ambience through `Lyria 3 Clip`.
6. The YaYa backend returns the final payload.
7. OpenClaw posts the response back to Discord.

## Implementation Note

For the prototype, OpenClaw should remain replaceable. If later the provider issue is fixed, the integration boundary can be revisited, but the current design should assume:

- OpenClaw is the shell
- YaYa backend is the brain
