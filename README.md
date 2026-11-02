# third1.ai

> **A structured AI referee for everyday disagreements.**

third1.ai turns an informal argument into a small, evidence-aware decision workflow. Each participant gives testimony, the system asks only the clarifying questions that could change the outcome, and a final verdict explains the reasoning without pretending that every dispute has a clear winner.

This project is intentionally designed as more than a chat wrapper: the user experience, API contracts, prompt design, validation, failure handling, and output schema work together as one decision system.

## Why this project

Most AI applications ask a model to produce an answer immediately. third1.ai separates **information gathering** from **judgment**:

1. Capture both sides of the case.
2. Detect whether a material uncertainty remains.
3. Ask a targeted clarification question, up to three times.
4. Generate a structured verdict from the complete conversation.

That separation improves consistency, makes the interaction easier to reason about, and prevents the verdict prompt from having to guess what information is missing.

## Product flow

```text
Case setup
   |
   v
Two participant testimonies
   |
   +--> Optional voice input --> /api/transcribe
   |
   v
Clarification analysis --------> /api/analyze-case
   |                                  |
   |<-- ask one targeted question ----+
   |
   v
Structured verdict generation --> /api/generate-verdict
   |
   v
Verdict UI: conclusion, evidence, unknowns, reasoning, recommendations
```

The client owns the conversational state and renders the courtroom experience. Server routes own provider access, input validation, timeouts, response validation, and the AI contracts.

## Engineering highlights

### Deliberate AI orchestration

- Uses a two-stage reasoning flow instead of one oversized prompt.
- The clarification stage decides between `ask_clarification` and `ready_for_verdict`.
- Clarifications are limited to three per case and must target one participant.
- The verdict stage evaluates both participants independently and chooses one explicit category:
  - `person_a_more_reasonable`
  - `person_b_more_reasonable`
  - `both_wrong`
  - `both_have_valid_points`
  - `insufficient_information`

### Structured model outputs

Both AI routes use strict JSON schemas. This gives the UI stable contracts instead of relying on fragile text parsing:

- Clarification analysis returns an action, target speaker, question, and reason.
- Verdict generation returns a category, summary, participant assessments, supported points, disputed points, unknowns, reasoning, recommendations, and a closing remark.

The server validates the model response again before returning it to the browser. A model response is treated as untrusted external data, even when it was requested in JSON mode.

### Defensive API boundaries

The route handlers validate:

- Required case metadata and participant names.
- Conversation message speakers and message types.
- Message length and maximum conversation size.
- Clarification count and allowed workflow state.
- Audio MIME types and the 25 MB upload limit.
- Empty, malformed, or incomplete provider responses.

Provider calls use `AbortController` timeouts and return explicit HTTP errors for configuration failures, invalid input, rate limits, timeouts, and upstream failures. The Groq API key is kept server-side and is never exposed to the client.

### Token-conscious prompt design

Prompt instructions are compact and focused on invariants that affect correctness: evidence attribution, uncertainty, skipped answers, material clarification, category selection, and output requirements. The conversation remains in the user message, while reusable behavior rules stay in the system prompt.

This keeps the system prompt predictable and reduces unnecessary token usage without removing the safeguards that make the verdict useful.

### Voice input

The browser records audio with `MediaRecorder`, selects a supported MIME type, and sends the file to `/api/transcribe`. The server normalizes MIME types, validates size and format, and uses Groq Whisper (`whisper-large-v3`) for transcription. Transcription preserves the spoken content and supports multilingual speech through Latin-character transliteration.

## Architecture

| Area | Implementation |
| --- | --- |
| UI | Next.js App Router, React client components |
| Styling | Tailwind CSS v4 through the Turbopack loader |
| AI provider | Groq Chat Completions and Whisper APIs |
| Model | `openai/gpt-oss-20b` for analysis and verdict generation |
| Runtime validation | TypeScript guards and strict response-schema checks |
| API surface | Next.js Route Handlers under `app/api` |
| Deployment shape | Stateless web application; no database required for the current flow |

### Main routes

| Route | Responsibility |
| --- | --- |
| `POST /api/analyze-case` | Decide whether another clarification is valuable |
| `POST /api/generate-verdict` | Produce and validate the final structured verdict |
| `POST /api/transcribe` | Validate audio and return a transcript |

## Repository structure

```text
app/
  api/
    analyze-case/route.ts       # clarification decision contract
    generate-verdict/route.ts   # final verdict contract
    transcribe/route.ts         # audio validation and transcription
  case/page.tsx                 # case workflow and courtroom UI
  page.tsx                      # landing page
  globals.css                   # global styling
next.config.ts                  # Next.js and Turbopack configuration
```

## Getting started

### Prerequisites

- Node.js compatible with the installed Next.js version
- npm
- A Groq API key

### Install

```bash
npm install
```

### Configure environment

Create `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
```

The environment file is ignored by git. Never commit the real key.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
# Run the production build and TypeScript validation
npm run build

# Run ESLint
npm run lint
```

The production build verifies that the App Router pages and API route handlers compile together. The lint command covers the full repository; existing UI lint findings should be resolved before treating lint as a release gate.

## Engineering trade-offs

### Stateless client workflow

Case state currently lives in the browser rather than a database. This keeps the prototype simple, avoids storing sensitive interpersonal conversations, and makes local deployment inexpensive. The trade-off is that cases are not persisted across refreshes or devices.

### Strict schemas over flexible prose

The model has less freedom in its response shape, but the UI gets deterministic fields and the server can reject malformed output. This is the safer choice for a user-facing decision workflow.

### Bounded clarification

Three questions is a deliberate product constraint: enough room to resolve important ambiguity, but not enough to create an expensive or endless interview. The system proceeds when it has sufficient evidence rather than demanding certainty.

### External AI dependency

Groq provides fast inference and transcription, but the application remains dependent on provider availability, quotas, and model behavior. Provider failures are surfaced as explicit API errors so the UI can present a recoverable state instead of a fabricated result.

## Future production hardening

- Add persistent case storage only with an explicit privacy and retention policy.
- Add authentication, abuse prevention, and per-user/provider rate limiting.
- Add automated route tests for invalid payloads, malformed model output, timeout behavior, and clarification limits.
- Add observability for latency, provider errors, token usage, and workflow completion rates without logging private testimony.
- Add a provider abstraction to make model fallback and controlled model upgrades easier.

## License

No license has been specified yet.
