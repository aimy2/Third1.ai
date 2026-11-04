from uuid import uuid4
from datetime import datetime, timezone

from backend.third1_ai.graph.state import Third1State
from backend.third1_ai.models.schemas import (
    ClarificationStatus,
    Message,
    MessageType,
    SpeakerType,
    ParticipantSpeaker,
)


MAX_ANSWERED_CLARIFICATIONS = 3


def answer_clarification(
    state: Third1State,
    clarification_id: str,
    participant: ParticipantSpeaker,
    answer: str,
) -> dict:
    """Record a participant's answer to a pending clarification."""

    answer = answer.strip()

    if not answer:
        raise ValueError("The clarification answer cannot be empty.")

    if state["clarification_count"] >= MAX_ANSWERED_CLARIFICATIONS:
        raise ValueError("The maximum of three answered clarifications has been reached.")

    clarifications = list(state["clarifications"])

    clarification_index = next(
        (
            index
            for index, item in enumerate(clarifications)
            if item.id == clarification_id
        ),
        None,
    )

    if clarification_index is None:
        raise ValueError("Clarification not found.")

    clarification = clarifications[clarification_index]

    if clarification.status != ClarificationStatus.PENDING:
        raise ValueError("This clarification is no longer pending.")

    if clarification.target_speaker != participant:
        raise ValueError("This clarification belongs to the other participant.")

    answer_message_id = str(uuid4())

    answer_message = Message(
        id=answer_message_id,
        speaker=SpeakerType(participant.value),
        content=answer,
        message_type=MessageType.CLARIFICATION_ANSWER,
        clarification_id=clarification_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    updated_clarification = clarification.model_copy(
        update={
            "status": ClarificationStatus.ANSWERED,
            "answer_message_id": answer_message_id,
        }
    )

    clarifications[clarification_index] = updated_clarification

    updated_case = state["case"].model_copy(
        update={
            "messages": [
                *state["case"].messages,
                answer_message,
            ]
        }
    )

    return {
        "case": updated_case,
        "clarifications": clarifications,
        "clarification_count": state["clarification_count"] + 1,
    }


def skip_clarification(
    state: Third1State,
    clarification_id: str,
    participant: ParticipantSpeaker,
) -> dict:
    """Mark a pending clarification as skipped without counting it."""

    clarifications = list(state["clarifications"])

    clarification_index = next(
        (
            index
            for index, item in enumerate(clarifications)
            if item.id == clarification_id
        ),
        None,
    )

    if clarification_index is None:
        raise ValueError("Clarification not found.")

    clarification = clarifications[clarification_index]

    if clarification.status != ClarificationStatus.PENDING:
        raise ValueError("This clarification is no longer pending.")

    if clarification.target_speaker != participant:
        raise ValueError("This clarification belongs to the other participant.")

    updated_clarification = clarification.model_copy(
        update={
            "status": ClarificationStatus.SKIPPED,
        }
    )

    clarifications[clarification_index] = updated_clarification

    return {
        "clarifications": clarifications,
        "clarification_count": state["clarification_count"],
    }
