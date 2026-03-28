# YaYa Product Spec

## 1. Product Definition

YaYa is a data-grown digital human system built from user-authorized relational data.

Unlike character chat products that begin with a fixed role or manually written persona prompt, YaYa begins with real conversation history and derives how the digital human should speak, care, react, remind, and initiate contact.

The output is not "a chatbot acting like a mother" or "a preset companion." The output is a personalized digital human that feels like it emerged from the relational patterns already present in the user's life.

## 2. Product Thesis

People do not only miss information. They miss familiar patterns of care.

YaYa recreates relational familiarity by learning:

- how someone checks on you
- how they comfort you
- what topics they notice repeatedly
- how direct or indirect they are
- whether they initiate often or wait
- which phrases, cadence, and emotional cues make the interaction feel known

## 3. User Value

Primary value:

- turn personal relational data into a living, interactive digital human
- preserve familiar emotional style without relying on brittle role templates
- enable ongoing, lightweight supportive interaction in text or voice

Secondary value:

- create a memorable demo where the user can see traceable links from source data to generated behavior
- let the avatar, voice, and tone feel coherent with the inferred relationship style

## 4. Product Boundaries

YaYa should not be positioned as:

- therapy
- clinical mental health support
- diagnosis or treatment
- a general productivity assistant
- a preset role catalog

Allowed positioning:

- familiar digital companion
- relationship-native virtual human
- emotionally familiar interactive persona

## 5. Design Principle

The system should prefer this chain:

`authorized data -> extracted relational features -> persona + behavior policy -> live interaction`

The system should avoid this chain:

`role menu -> generic prompt -> shallow style overlay`

## 6. Primary User Journey

### Step 1: Upload

The user uploads:

- exported WeChat or Discord conversations
- optional contact labels
- optional photos
- optional text descriptions such as "gentle but always nags me to sleep early"

### Step 2: Parse and Normalize

The system:

- splits messages by speaker, timestamp, conversation, and language
- removes unsupported or broken records
- groups conversations into relationship threads

### Step 3: Extract Relational Signals

The system infers:

- care style
- initiative style
- emotional tone
- conflict/repair pattern
- recurring life concerns
- preferred encouragement pattern
- signature wording and language habits

### Step 4: Generate YaYa Persona

The system creates:

- persona summary
- speaking principles
- proactive behavior policy
- emotional response policy
- memory seeds
- sample phrases grounded in extracted patterns

### Step 5: Configure Avatar

The system generates or configures:

- name or nickname
- avatar style
- expression set
- voice profile

### Step 6: Interact

The user enters a live chat or voice room where YaYa can:

- respond naturally
- remember context
- initiate gentle check-ins
- reflect familiar phrasing and care patterns

## 7. MVP Definition

The MVP should prove three things:

1. YaYa can extract a recognizable relational style from uploaded chat data.
2. YaYa can produce a persona that is traceable to those signals.
3. YaYa can interact in a way that feels proactive and familiar rather than generic.

## 8. MVP Feature Set

### 8.1 Data Ingestion

Must have:

- upload chat export files
- parse a small supported format set
- preview parsed speakers and threads

Nice to have:

- merge multiple files
- show import quality warnings

### 8.2 Relational Analysis

Must have:

- summarize each relationship thread
- extract tone and care patterns
- identify recurring reminders, concerns, and support behaviors
- surface representative example lines as evidence

### 8.3 Persona Generation

Must have:

- generate a YaYa persona card
- define proactive prompts
- define comfort/check-in/suggestion styles
- define "do not do" behavior constraints

### 8.4 Avatar Layer

Must have:

- upload reference images
- choose a lightweight avatar style
- map emotional states to 2D expressions

Nice to have:

- `Imagen 4` generated portrait variants for alternate polished moods or looks

### 8.5 Live Interaction

Must have:

- text chat
- push-to-talk or click-to-speak voice
- session memory
- persistent memory summary
- proactive check-in trigger

### 8.6 Explainability

Must have:

- show why YaYa behaves this way
- display evidence snippets or extracted traits
- let the user edit or suppress uncomfortable traits

## 9. Information Architecture

Recommended hackathon IA:

1. Landing / Demo intro
2. Import data
3. Relationship analysis
4. Persona studio
5. Avatar setup
6. Live chat
7. Memory and trace view

## 10. Demo Flow

### Screen 1: Landing

Message:

"Grow a digital human from your relationship data."

Actions:

- start demo
- load sample dataset

### Screen 2: Import

Show:

- upload area
- supported sources
- consent reminder
- parser status

### Screen 3: Analysis

Show:

- extracted traits
- recurring concerns
- tone map
- initiative frequency
- representative message evidence

### Screen 4: Persona Studio

Show:

- generated YaYa summary
- care style sliders or tags
- proactive examples
- editable boundaries

### Screen 5: Avatar Setup

Show:

- reference photo upload
- text appearance prompt
- chosen avatar preview
- voice mode selection

### Screen 6: Live Interaction

Show:

- chat panel
- voice controls
- emotional state indicator
- proactive nudge examples

### Screen 7: Trace / Memory

Show:

- memory timeline
- why-did-YaYa-say-this panel
- linked evidence from source data

## 11. Core System Objects

### User

- id
- preferences
- consent state

### Data Source

- source type
- upload metadata
- parse status

### Relationship Thread

- participants
- time range
- message count
- dominant language

### Relational Profile

- tone descriptors
- care behaviors
- initiative behaviors
- concern topics
- wording patterns

### Persona Card

- name
- core relational summary
- speaking rules
- proactive policies
- emotional style
- boundaries

### Avatar Profile

- visual prompt
- reference images
- expression map
- voice config

### Memory Item

- short-term session memory
- long-term user preference
- relational memory

## 12. Success Criteria For Hackathon

The prototype is successful if a demo viewer can say:

- "I can see how this persona came from the uploaded data."
- "The proactive behavior feels familiar, not random."
- "This is different from choosing a role from a list."

## 13. Risks

- extraction may drift into generic summaries instead of relational patterns
- proactive messages may feel repetitive if evidence mapping is weak
- avatar quality may distract from the core relational intelligence
- users may feel uncomfortable if traceability and editing controls are weak

## 14. Product Decisions For Prototype

Recommended decisions:

- support only one or two chat import formats first
- keep avatar lightweight and secondary
- prioritize text-first interaction, with voice as demo enhancement
- build traceability into the main flow, not as an afterthought
- use sample datasets for stage demos in case personal exports are messy
- use a static or lightly animated 2D avatar instead of video generation
- use cached emotion buckets first and keep dynamic image updates optional
