# OpenClaw Local Setup

OpenClaw is installed locally and available as:

- `openclaw`
- `C:\Users\12392\AppData\Roaming\npm\openclaw.cmd`

## Recommended Local Commands

- `npm run openclaw:help`
- `npm run openclaw:doctor`
- `npm run openclaw:gateway`
- `npm run openclaw:dashboard`
- `npm run openclaw:install-bridge`
- `npm run openclaw:plugins`
- `npm run openclaw:skills`

## Discord Channel Setup

Add a Discord bot token to OpenClaw:

```powershell
openclaw --dev channels add --channel discord --token <YOUR_DISCORD_BOT_TOKEN> --name yaya-discord
```

Useful checks:

```powershell
openclaw --dev channels status
openclaw --dev status
```

## YaYa Backend Contract

OpenClaw should forward normalized inbound messages to:

```text
POST http://localhost:8787/v1/openclaw/message
```

Headers:

```text
Content-Type: application/json
x-openclaw-secret: <OPENCLAW_SHARED_SECRET if configured>
```

Request body:

```json
{
  "channel": "discord",
  "userId": "123",
  "text": "今天有点累",
  "history": []
}
```

Response body:

```json
{
  "channel": "discord",
  "userId": "123",
  "reply": {
    "message": {
      "role": "assistant",
      "text": "..."
    },
    "rationale": ["..."]
  }
}
```

## Bridge Plugin

This repo now includes a local OpenClaw plugin at [openclaw-plugins/yaya-discord-bridge](C:\Users\12392\Desktop\YaYa\openclaw-plugins\yaya-discord-bridge).

Install it into the active OpenClaw profile:

```powershell
npm run openclaw:install-bridge
```

The bridge intercepts `before_dispatch` for Discord and forwards the message to the YaYa backend instead of using an OpenClaw model provider path.

## Locked Runtime Split

- `M2.7` is the main brain
- `Gemini TTS` is the only speech path in v1
- `Imagen 4` is the static avatar asset layer
- `Lyria 3 Clip` is the ambience layer
- `OpenClaw` remains the channel and execution layer only

## Minimum Installed Skills

Installed through ClawHub into the dev workspace:

- `bot-status-api`
- `discord-connect-wizard`

Verification commands:

```powershell
openclaw --dev skills info bot-status-api
openclaw --dev skills info discord-connect-wizard
openclaw --dev dashboard --no-open
```

## Current Limitation

The remaining setup work is operational rather than code:

- add a real Discord bot token to OpenClaw
- enable the Discord plugin/profile
- verify the bridge flow in Control UI once the gateway is up
