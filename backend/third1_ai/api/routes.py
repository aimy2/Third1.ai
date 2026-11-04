
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.third1_ai.api.case_store import (
    get_case_state,
    save_case_state,
    update_case_state,
)
from backend.third1_ai.graph.state import Third1State
from backend.third1_ai.graph.workflow import resume_workflow
from backend.third1_ai.models.schemas import (
    Case,
    Message,
    MessageType,
    Participant,
    ParticipantSpeaker,
    SpeakerType,
)
from backend.third1_ai.services.clarification_service import (
    answer_clarification,
    skip_clarification,
)


router = APIRouter(prefix="/cases", tags=["Cases"])


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------

class CreateCaseRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    participant_01_name: str = Field(min_length=1, max_length=100)
    participant_02_name: str = Field(min_length=1, max_length=100)


class SubmitTestimonyRequest(BaseModel):
    participant: ParticipantSpeaker
    content: str = Field(min_length=1)


class AnswerClarificationRequest(BaseModel):
    clarification_id: str
    participant: ParticipantSpeaker
    answer: str = Field(min_length=1)


class SkipClarificationRequest(BaseModel):
    clarification_id: str
    participant: ParticipantSpeaker


# ---------------------------------------------------------
# RESPONSE HELPER
# ---------------------------------------------------------

def serialize_case_state(state: Third1State) -> dict:
    case = state["case"]
    investigator_output = state["investigator_output"]
    verdict = state["verdict"]

    pending_clarifications = [
        item.model_dump(mode="json")
        for item in state["clarifications"]
        if item.status.value == "pending"
    ]

    if verdict is not None:
        status = "verdict_ready"
    elif pending_clarifications:
        status = "clarification_required"
    elif investigator_output is not None:
        status = "investigation_complete"
    else:
        status = "awaiting_testimony"

    return {
        "case_id": case.id,
        "title": case.title,
        "participant_01": case.participant_01.model_dump(mode="json"),
        "participant_02": case.participant_02.model_dump(mode="json"),
        "messages": [
            message.model_dump(mode="json")
            for message in case.messages
        ],
        "clarifications": [
            clarification.model_dump(mode="json")
            for clarification in state["clarifications"]
        ],
        "pending_clarifications": pending_clarifications,
        "investigator_output": (
            investigator_output.model_dump(mode="json")
            if investigator_output else None
        ),
        "clarification_count": state["clarification_count"],
        "verdict": (
            verdict.model_dump(mode="json")
            if verdict else None
        ),
        "status": status,
    }


# ---------------------------------------------------------
# CASE CREATION
# ---------------------------------------------------------

@router.post("", status_code=201)
async def create_case(request: CreateCaseRequest):
    title = request.title.strip()
    name_01 = request.participant_01_name.strip()
    name_02 = request.participant_02_name.strip()

    if not title or not name_01 or not name_02:
        raise HTTPException(
            status_code=422,
            detail="Case title and participant names cannot be empty.",
        )

    case = Case(
        id=str(uuid4()),
        title=title,
        participant_01=Participant(
            id=ParticipantSpeaker.PARTICIPANT_01,
            name=name_01,
        ),
        participant_02=Participant(
            id=ParticipantSpeaker.PARTICIPANT_02,
            name=name_02,
        ),
        messages=[],
    )

    initial_state: Third1State = {
        "case": case,
        "clarifications": [],
        "investigator_output": None,
        "clarification_count": 0,
        "verdict": None,
    }

    save_case_state(initial_state)

    return serialize_case_state(initial_state)


# ---------------------------------------------------------
# GET CASE
# ---------------------------------------------------------

@router.get("/{case_id}")
async def get_case(case_id: str):
    try:
        state = get_case_state(case_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    return serialize_case_state(state)


# ---------------------------------------------------------
# OPENING TESTIMONY
# ---------------------------------------------------------

# ---------------------------------------------------------
# PARTICIPANT TESTIMONY AND FOLLOW-UP MESSAGES
# ---------------------------------------------------------


@router.post("/{case_id}/testimony")
async def submit_testimony(
    case_id: str,
    request: SubmitTestimonyRequest,
):
    try:
        state = get_case_state(case_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    if state["verdict"] is not None:
        raise HTTPException(
            status_code=409,
            detail="This case already has a final verdict.",
        )

    content = request.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty.",
        )

    case = state["case"]

    speaker = (
        SpeakerType.PARTICIPANT_01
        if request.participant == ParticipantSpeaker.PARTICIPANT_01
        else SpeakerType.PARTICIPANT_02
    )

    submitted_speakers = {
        message.speaker
        for message in case.messages
        if (
            message.message_type == MessageType.TESTIMONY
            and message.speaker in {
                SpeakerType.PARTICIPANT_01,
                SpeakerType.PARTICIPANT_02,
            }
        )
    }

    both_participants = {
        SpeakerType.PARTICIPANT_01,
        SpeakerType.PARTICIPANT_02,
    }

    # Ordinary testimony is permanently closed after both
    # participants have submitted their opening statements.
    if both_participants.issubset(submitted_speakers):
        raise HTTPException(
            status_code=409,
            detail=(
                "Opening testimonies are closed. "
                "Please answer or skip any pending clarification."
            ),
        )

    # Each participant can submit only one opening testimony.
    if speaker in submitted_speakers:
        raise HTTPException(
            status_code=409,
            detail="This participant has already submitted opening testimony.",
        )

    # Do not accept testimony while a clarification is pending.
    has_pending_clarification = any(
        item.status.value == "pending"
        for item in state["clarifications"]
    )

    if has_pending_clarification:
        raise HTTPException(
            status_code=409,
            detail="A clarification is pending. Please answer or skip it first.",
        )

    message = Message(
        id=str(uuid4()),
        speaker=speaker,
        content=content,
        message_type=MessageType.TESTIMONY,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    updated_case = case.model_copy(
        update={
            "messages": [
                *case.messages,
                message,
            ]
        }
    )

    updated_state = update_case_state(
        case_id,
        {"case": updated_case},
    )

    submitted_speakers.add(speaker)

    both_submitted = both_participants.issubset(submitted_speakers)

    if not both_submitted:
        return {
            **serialize_case_state(updated_state),
            "status": "awaiting_other_participant",
        }

    # Both opening testimonies are now submitted.
    # The Investigator reviews them and either asks for clarification
    # or allows the Referee to generate the final verdict.
    return await run_workflow(case_id, updated_state)

# ---------------------------------------------------------
# ANSWER CLARIFICATION
# ---------------------------------------------------------

@router.post("/{case_id}/answer")
async def submit_clarification_answer(
    case_id: str,
    request: AnswerClarificationRequest,
):
    try:
        state = get_case_state(case_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    if state["verdict"] is not None:
        raise HTTPException(
            status_code=409,
            detail="This case already has a final verdict.",
        )

    answer = request.answer.strip()

    if not answer:
        raise HTTPException(
            status_code=422,
            detail="Clarification answer cannot be empty.",
        )

    try:
        updates = answer_clarification(
            state=state,
            clarification_id=request.clarification_id,
            participant=request.participant,
            answer=answer,
        )
    except (ValueError, KeyError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    updated_state = update_case_state(case_id, updates)

    return await run_workflow(case_id, updated_state)


# ---------------------------------------------------------
# SKIP CLARIFICATION
# ---------------------------------------------------------

@router.post("/{case_id}/skip")
async def skip_case_clarification(
    case_id: str,
    request: SkipClarificationRequest,
):
    try:
        state = get_case_state(case_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    if state["verdict"] is not None:
        raise HTTPException(
            status_code=409,
            detail="This case already has a final verdict.",
        )

    try:
        updates = skip_clarification(
            state=state,
            clarification_id=request.clarification_id,
            participant=request.participant,
        )
    except (ValueError, KeyError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    updated_state = update_case_state(case_id, updates)

    # Record the skip as a neutral system event.
    # It is not an answer and does not count toward the limit.
    skipped_message = Message(
        id=str(uuid4()),
        speaker=SpeakerType.SYSTEM,
        content="The clarification was skipped.",
        message_type=MessageType.SYSTEM_EVENT,
        clarification_id=request.clarification_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    updated_case = updated_state["case"].model_copy(
        update={
            "messages": [
                *updated_state["case"].messages,
                skipped_message,
            ]
        }
    )

    updated_state = update_case_state(
        case_id,
        {"case": updated_case},
    )

    return await run_workflow(case_id, updated_state)


# ---------------------------------------------------------
# LANGGRAPH EXECUTION
# ---------------------------------------------------------

async def run_workflow(
    case_id: str,
    current_state: Third1State,
):
    try:
        result = resume_workflow(
            current_state,
            {},
        )

        final_state = update_case_state(
            case_id,
            result,
        )

        return serialize_case_state(final_state)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Case workflow failed: {str(error)}",
        ) from error
