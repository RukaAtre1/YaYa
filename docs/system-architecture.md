# YaYa System Architecture

## 1. Architecture Goal

Build a hackathon prototype with a fixed runtime split:

- `MiniMax M2.7` as the main brain
- `Gemini TTS` as the single speech path for v1
- `Imagen 4` as the static avatar asset layer
- `Lyria 3 Clip` as the ambient mood layer
- `OpenClaw` as the channel and execution shell

Optional later enhancement:

- Gemini native image generation may be added as a dynamic expression layer, but it is not required for v1.

## 2. High-Level Architecture

```text
Authorized Chat Data
        |
        v
Ingestion + Parsing Layer
        |
        v
Relational Analysis Pipeline
        |
        v
Persona Compiler
        |
        +------> Avatar Config / Generation
        |
        v
Realtime Dialogue Orchestrator
        |
        +------> Memory Store
        +------> Proactive Trigger Engine
        +------> Voice / Avatar Output
```

## 3. Recommended Prototype Stack

Frontend:

- Next.js or Vite React
- Tailwind or minimal custom CSS
- WebSocket or SSE for live updates

Backend:

- Node.js with Express or Next API routes
- background job queue for parsing and analysis

Storage:

- SQLite or Postgres for prototype metadata
- object storage or local disk for uploads
- vector store optional, only if needed for memory retrieval

Realtime:

- WebRTC or simple streaming wrapper for voice
- websocket session channel for live state sync

## 4. Core Services

### 4.1 Ingestion Service

Responsibilities:

- accept uploads
- validate source format
- normalize messages into a common schema
- persist parse artifacts

Normalized message shape:

```json
{
  "thread_id": "t1",
  "speaker_id": "mother",
  "speaker_name": "Mom",
  "timestamp": "2026-03-28T10:15:00Z",
  "text": "Did you eat properly today?",
  "source": "wechat"
}
```

### 4.2 Relational Analysis Service

Responsibilities:

- summarize threads
- extract style features
- infer care and initiative patterns
- produce evidence-backed trait outputs

Suggested outputs:

- tone profile
- care profile
- recurring concerns
- initiative score
- signature expressions
- example evidence snippets

### 4.3 Persona Compiler

Responsibilities:

- convert extracted signals into a structured persona card
- create dialogue rules
- define proactive behaviors
- produce safety and boundary instructions

Persona card shape:

```json
{
  "persona_name": "YaYa",
  "relationship_summary": "Protective, gentle, observant, reminds the user to eat and sleep on time.",
  "tone_traits": ["warm", "gently nagging", "concise"],
  "proactive_patterns": [
    "check meals",
    "check sleep",
    "ask about workload"
  ],
  "language_habits": [
    "short questions",
    "soft concern before advice"
  ],
  "boundaries": [
    "do not claim to be a therapist",
    "do not invent false life events"
  ],
  "evidence_refs": ["msg_182", "msg_391", "msg_441"]
}
```

### 4.4 Dialogue Orchestrator

Responsibilities:

- compose live prompts from persona, memory, and current context
- call `M2.7` for reply generation, emotion/state tagging, action intent generation, turn classification, and light planning
- maintain consistency across turns
- decide when to trigger proactive behavior

### 4.5 Memory Service

Responsibilities:

- store session memory
- store durable user preferences
- store relational anchors extracted from source data

Memory layers:

- source-grounded relational memory
- persistent user memory from live interactions
- session context memory

### 4.6 Proactive Trigger Engine

Responsibilities:

- schedule or trigger check-ins
- decide whether to speak first
- generate small supportive nudges based on persona policy

Trigger examples:

- long inactivity
- bedtime window
- user previously mentioned stress
- meal-time reminder pattern inferred from source data

## 5. Locked Runtime Allocation

### M2.7

Use for:

- main relational dialogue engine
- emotionally coherent multi-turn chat
- persona-consistent response generation
- familiar tone rendering
- data summarization
- relational pattern extraction
- thread analysis
- intent classification
- orchestration helpers
- proactive planning
- emotion/state tag generation
- action/task intent generation

### Gemini TTS

Use for:

- convert M2.7 reply text into spoken voice
- serve as the only spoken dialogue path in v1

Constraint:

- choose one speech path only
- do not mix Gemini Live and Gemini TTS in the same v1 runtime
- current default is `Gemini TTS`

### Imagen 4

Use for:

- final avatar art
- polished hero images
- static expression-state assets for cached buckets

Constraint:

- do not block chat on image generation
- use cached avatar states first

### Gemini Native Image Generation

Use for:

- optional later per-turn expression rendering

Constraint:

- optional only
- not required in v1
- should not block chat if added later

### Lyria 3 Clip

Use for:

- subtle background emotional ambience
- switch or select mood loops by bucket

Constraint:

- do not use for spoken dialogue
- do not switch on every turn
- route by emotion bucket instead

### OpenClaw

Use for:

- channels
- tools
- skills
- external task execution

Constraint:

- do not make OpenClaw the main reasoning engine

## 6. End-to-End Runtime Flow

### Offline / Precompute Phase

1. user uploads conversation export
2. ingestion service parses and normalizes data
3. `M2.7` analysis service extracts relational features
4. persona compiler generates persona card
5. `Imagen 4` avatar service prepares static portrait assets
6. memory service stores relational anchors

### Live Interaction Phase

1. user opens live session
2. orchestrator loads persona card + memory summary
3. user sends text or voice input
4. `M2.7` decides response mode and produces grounded reply, emotion tag, and optional action intent
5. reply text is spoken through `Gemini TTS`
6. avatar state swaps to a cached `Imagen 4` bucketed expression if needed
7. `Lyria 3 Clip` ambience stays or switches by mood bucket
8. OpenClaw executes any external task if action intent requires it
9. memory is updated
10. `M2.7`-driven proactive engine evaluates next trigger opportunities

## 6.1 Simplified Product Logic

The prototype should follow this one-line logic:

- `M2.7` handles understanding the user data, extracting relational patterns, deciding behavior, and producing reply text plus state tags
- `Gemini TTS` handles saying the reply out loud
- `Imagen 4` handles static avatar assets
- `Lyria 3 Clip` handles ambient emotional background
- `OpenClaw` handles channels and execution

## 7. Prompting Layers

Recommended prompt stack:

1. system layer
   Define product boundaries, non-therapy framing, truthfulness, and data-grounding rules.
2. persona layer
   Inject relational profile, tone traits, care patterns, and boundaries.
3. memory layer
   Inject relevant persistent user context and recent session context.
4. response policy layer
   Specify response brevity, supportive style, when to ask follow-up questions, and when to make small suggestions.
5. evidence layer
   Include extracted examples or style summaries, not raw full transcripts unless necessary.

## 8. Traceability Design

Every generated behavior should ideally have one of these supports:

- source-data evidence
- extracted relational trait
- user-edited preference
- runtime memory event

Prototype UI should expose:

- why this persona was generated
- why this message was proactive
- which style traits informed the tone

## 9. Safety and Boundary Rules

Must include:

- no medical or therapeutic claims
- no pretending to be a legally real person
- no fabricated memories presented as fact
- no unsupported emotional manipulation
- clear user controls to mute, edit, or reset traits

## 10. Suggested Backend Modules

Suggested folders:

```text
src/
  app/
  components/
  features/
    ingest/
    analysis/
    persona/
    avatar/
    chat/
    memory/
    proactive/
  lib/
    minimax/
    storage/
    prompts/
    utils/
```

## 10.1 Recommended Module-to-Model Mapping

### Ingest

- primary implementation: application code, parser, and storage
- model usage: none by default
- optional model call: `M2.7` for import cleanup summaries or parse-quality explanations

### Analysis

- model: `M2.7`
- responsibilities:
  - summarize chat threads
  - extract tone
  - extract care style
  - extract initiative style
  - identify recurring concerns
  - identify language habits
  - produce evidence snippets

### Persona

- model: `M2.7`
- responsibilities:
  - compile relational profile into persona card
  - define proactive behaviors
  - define comfort, follow-up, reminder, and suggestion styles
  - define boundaries and "do not do" rules

### Chat

- model: `M2.7`
- responsibilities:
  - multi-turn dialogue
  - relational tone control
  - emotional support
  - persona consistency
  - response generation

### Orchestration

- model: `M2.7`
- responsibilities:
  - classify the current turn
  - decide comfort vs follow-up vs reminder vs suggestion
  - decide whether to trigger a proactive check-in
  - generate lightweight response plans when needed

### Voice

- model: `Gemini TTS`
- responsibilities:
  - convert YaYa text replies into spoken output
  - remain the only speech path in v1

### Avatar

- model: `Imagen 4`
- responsibilities:
  - generate portrait and lightweight 2D avatar assets
  - generate static cached emotional states

### Dynamic Expression

- model: optional Gemini native image generation
- responsibilities:
  - later per-turn expression updates if added

### Ambience

- model: `Lyria 3 Clip`
- responsibilities:
  - provide subtle mood loops by emotion bucket

### Execution

- model: `OpenClaw`
- responsibilities:
  - execute external task intents and route channel events

## 11. Hackathon Build Order

Recommended order:

1. build import + normalized schema
2. build relational analysis pipeline
3. build persona card output
4. build chat UI with text loop
5. add persistent memory
6. add proactive trigger logic
7. add voice output
8. add avatar polish

## 12. What To Fake If Time Is Short

Acceptable shortcuts for a demo:

- use one well-structured import format first
- precompute relational analysis after upload instead of true streaming
- use preset expression swaps instead of full real-time face animation
- use generated demo data for on-stage reliability
- render proactive messages on timer plus simple context rules
- use a small set of cached `Imagen 4` avatar states instead of continuous animation

Do not fake:

- the traceability from data to persona
- the distinction between preset role play and data-grown behavior
- the proactive familiar tone that defines the product thesis
