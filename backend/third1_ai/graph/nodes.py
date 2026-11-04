from uuid import uuid4
from datetime import datetime, timezone

from backend.third1_ai.agents.referee import evaluate_case
from backend.third1_ai.agents.investigator import investigate_case
from backend.third1_ai.graph.state import Third1State
from backend.third1_ai.models.schemas import (
    Clarification,
    ClarificationStatus,
    InvestigatorAction,
    Message,
    MessageType,
    SpeakerType,
)


MAX_ANSWERED_CLARIFICATIONS = 3


def investigator_node(state: Third1State) -> dict:
    """Run the Investigator and record any new clarification question."""

    result = investigate_case(
        case=state["case"],
        clarifications=state["clarifications"],
    )

    if result.action == InvestigatorAction.ASK_CLARIFICATION:

        # Stop asking once three clarifications have been answered.
        if state["clarification_count"] >= MAX_ANSWERED_CLARIFICATIONS:
            result = result.model_copy(
                update={
                    "action": InvestigatorAction.READY_FOR_VERDICT,
                    "next_question": None,
                }
            )

            return {"investigator_output": result}

        question = result.next_question

        # Generate one ID to connect the clarification record
        # with its corresponding conversation message.
        clarification_id = str(uuid4())

        clarification = Clarification(
            id=clarification_id,
            question=question.question,
            target_speaker=question.target_speaker,
            reason=question.reason,
            status=ClarificationStatus.PENDING,
        )

        # Store the question in the conversation history.
        question_message = Message(
            id=str(uuid4()),
            speaker=SpeakerType.AI,
            content=question.question,
            message_type=MessageType.CLARIFICATION_QUESTION,
            clarification_id=clarification_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        updated_case = state["case"].model_copy(
            update={
                "messages": [
                    *state["case"].messages,
                    question_message,
                ]
            }
        )

        return {
            "case": updated_case,
            "investigator_output": result,
            "clarifications": [
                *state["clarifications"],
                clarification,
            ],
        }

    return {"investigator_output": result}


def referee_node(state: Third1State) -> dict:
    """Run the Referee and store the final verdict."""

    result = evaluate_case(
        case=state["case"],
        investigator_output=state["investigator_output"],
        clarifications=state["clarifications"],
    )

    return {"verdict": result}