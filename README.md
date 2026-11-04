# Third1 AI

**Your unbiased third one who isn't afraid to tell you who is wrong.**

🌐 **Live Demo:** [https://third1-ai.vercel.app/](https://third1-ai.vercel.app/)

Third1 AI is an AI-powered referee for everyday disagreements. Two participants present their accounts of a dispute, an Investigator identifies material uncertainties and asks targeted clarification questions, and a Referee evaluates both positions and produces a structured verdict.

The goal is not to manufacture a winner. The system distinguishes supported information, disputed claims, reasonable inferences, and unknowns so that its conclusions remain proportionate to the available evidence.

## Product Workflow

1. Both participants enter a case and submit their opening testimony.
2. The Investigator examines the accounts and identifies material uncertainties.
3. If clarification could change the outcome, the Investigator asks one participant a targeted question.
4. The selected participant can answer or skip the question.
5. The investigation continues until the Investigator is ready for a verdict or the clarification limit is reached.
6. The Referee evaluates both participants and returns a structured verdict.

Each participant can submit one opening testimony. Ordinary testimony closes after both opening statements. Subsequent interaction is limited to targeted clarification answers or skips.

There can be at most three answered clarifications. Skipped clarifications do not count toward this limit and are not treated as evidence against the participant.

## Verdict Categories

The Referee returns one of five categories:

| Category | Meaning |
|---|---|
| `person_a_more_reasonable` | Participant 01 has the stronger position. |
| `person_b_more_reasonable` | Participant 02 has the stronger position. |
| `both_wrong` | Both participants have meaningful faults. |
| `both_have_valid_points` | Both have legitimate positions, with neither clearly more reasonable. |
| `insufficient_information` | Material information is missing and could change the decision. |

The verdict includes individual participant assessments, supported points, disputed points, unknowns, reasoning, recommendations, and a closing remark.

## Architecture

Third1 AI uses a Next.js frontend and a separate FastAPI backend. LangGraph orchestrates two AI agents.

```text
                 Next.js Frontend
                        |
                        v
               Next.js API Proxy
                        |
                        v
                   FastAPI
                        |
                        v
                 LangGraph Graph
                        |
                 Investigator
                        |
             +----------+----------+
             |                     |
      Ask clarification      Ready for verdict
             |                     |
             v                     v
       Participant input         Referee
             |                     |
             +---- Resume ---------+
                                   |
                                   v
                           Structured Verdict
```

### Main Components

| Component | Responsibility |
|---|---|
| Next.js | Courtroom interface, participant interaction, and voice-input experience |
| Next.js backend proxy | Forwards frontend API requests to FastAPI |
| FastAPI | Case creation, state management, validation, and API responses |
| LangGraph | Controls the Investigator-to-Referee workflow |
| Investigator | Reviews the accounts and decides whether clarification is necessary |
| Referee | Produces the final structured assessment |
| Groq | Provides language-model inference and speech transcription |

### Repository Structure

```text
Third1.ai/
├── app/
│   ├── api/
│   │   ├── backend/
│   │   │   └── [...path]/route.ts
│   │   └── transcribe/route.ts
│   ├── case/page.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── backend/
│   ├── evaluation/
│   └── third1_ai/
│       ├── agents/
│       ├── api/
│       ├── graph/
│       ├── models/
│       ├── prompts/
│       ├── services/
│       └── main.py
├── public/
├── .env.local
├── .gitignore
├── next.config.ts
├── package.json
├── requirements.txt
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.12 or a compatible Python version
- A Groq API key

### 1. Clone the Repository

```bash
git clone https://github.com/aimy2/Third1.ai.git
cd Third1.ai
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Create and Activate a Python Environment

Using Conda:

```bash
conda create -n third1-backend python=3.12 -y
conda activate third1-backend
```

Or use another Python virtual environment.

### 4. Install Backend Dependencies

```bash
python -m pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create `.env.local` in the repository root:

```env
GROQ_API_KEY=your_groq_api_key
THIRD1_BACKEND_URL=http://127.0.0.1:8000
```

Keep your actual API key private. `.env.local` is excluded from Git.

### 6. Start the FastAPI Backend

In the first terminal, with the Python environment activated:

```bash
uvicorn backend.third1_ai.main:app --reload --port 8000
```

The backend runs at:

```text
http://127.0.0.1:8000
```

Check its health:

```text
http://127.0.0.1:8000/health
```

Interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

### 7. Start the Next.js Frontend

In a second terminal:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend proxy uses `THIRD1_BACKEND_URL` to communicate with FastAPI.

## Backend API

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `POST` | `/cases` | Create a case and register both participants |
| `GET` | `/cases/{case_id}` | Retrieve case state |
| `POST` | `/cases/{case_id}/testimony` | Submit opening testimony |
| `POST` | `/cases/{case_id}/answer` | Submit a clarification answer |
| `POST` | `/cases/{case_id}/skip` | Skip a pending clarification |

The frontend accesses these endpoints through the Next.js proxy under `/api/backend/`.

### Example: Create a Case

```json
{
  "title": "Meeting disagreement",
  "participant_01_name": "Alex",
  "participant_02_name": "Sam"
}
```

### Example: Submit Opening Testimony

```json
{
  "participant": "participant_01",
  "content": "I arrived at the agreed meeting time."
}
```

### Example: Answer a Clarification

```json
{
  "clarification_id": "clarification-id",
  "participant": "participant_02",
  "answer": "I arrived later because of an unexpected meeting."
}
```

### Example: Skip a Clarification

```json
{
  "clarification_id": "clarification-id",
  "participant": "participant_02"
}
```

## Voice Input

The frontend supports microphone input using the browser's `MediaRecorder` API.

Audio is submitted to the Next.js transcription endpoint:

```text
POST /api/transcribe
```

The transcription route uses Groq Whisper for speech-to-text processing. Transcribed text can be reviewed and edited before submission.

## Testing and Verification

The backend evaluation scripts cover case storage, clarification handling, clarification limits, Investigator parsing, and workflow resumption.

Run the individual tests from the repository root:

```bash
python -m backend.evaluation.test_case_store
python -m backend.evaluation.test_clarification_limit
python -m backend.evaluation.test_clarification_service
python -m backend.evaluation.test_investigator_parser
python -m backend.evaluation.test_resume_workflow
python -m backend.evaluation.test_skip_resume_workflow
```

The full workflow smoke test invokes the AI workflow and may require a valid Groq API key:

```bash
python -m backend.evaluation.test_workflow
```

Frontend checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Current Limitations

- **In-memory case storage:** Case state is held in backend memory. Restarting the FastAPI process loses active cases.
- **Single shared device:** Both participants currently use the same device and can see the shared conversation.
- **No identity verification:** The application cannot independently verify who is physically responding to a clarification.
- **External AI dependency:** Inference and transcription depend on Groq availability, quotas, and model behavior.
- **No persistent accounts:** Authentication and cross-device case access are not implemented.

## Future Improvements

Potential production improvements include:

- Persistent storage with an explicit privacy and retention policy.
- Participant authentication and separate-device sessions.
- Rate limiting and abuse prevention.
- Automated API integration tests and model-output evaluation.
- Monitoring of latency, provider errors, token usage, and workflow completion without logging private testimony.
- Controlled model upgrades and provider fallback.

## License

No license has been specified yet.
