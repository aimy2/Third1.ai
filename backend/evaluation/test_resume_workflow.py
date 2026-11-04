from uuid import uuid4

from backend.evaluation.test_fixtures import create_test_case
from backend.third1_ai.graph.workflow import resume_workflow
from backend.third1_ai.services.clarification_service import answer_clarification
from backend.third1_ai.models.schemas import (
    Clarification,
    ClarificationStatus,
    ParticipantSpeaker,
)


def test_resume_workflow():
    # Create our existing sample case.
    case, _ = create_test_case()

    # Simulate a clarification that has already been asked.
    clarification = Clarification(
        id=str(uuid4()),
        question="What agreement had both participants made beforehand?",
        target_speaker=ParticipantSpeaker.PARTICIPANT_01,
        reason="The prior agreement may affect the assessment.",
        status=ClarificationStatus.PENDING,
    )

    # Prepare the initial graph state.
    initial_state = {
        "case": case,
        "clarifications": [clarification],
        "investigator_output": None,
        "clarification_count": 0,
        "verdict": None,
    }

    # Record the participant's answer.
    updates = answer_clarification(
        state=initial_state,
        clarification_id=clarification.id,
        participant=ParticipantSpeaker.PARTICIPANT_01,
        answer="We had agreed to discuss the matter before making a decision.",
    )

    print("\nAnswer recorded. Resuming workflow...")

    # Merge the answer into the state and run LangGraph again.
    result = resume_workflow(
        current_state=initial_state,
        state_updates=updates,
    )

    print("\n========== RESUMED WORKFLOW RESULT ==========")
    print("Answered clarifications:", result["clarification_count"])
    print("Investigator action:", result["investigator_output"].action.value)

    if result["investigator_output"].next_question:
        print("Next question:", result["investigator_output"].next_question.question)

    if result["verdict"]:
        print("Verdict:", result["verdict"].category.value)
        print("Summary:", result["verdict"].summary)

    assert result["clarification_count"] == 1
    assert result["clarifications"][0].status == ClarificationStatus.ANSWERED

    print("\nPASS: Workflow resumed with the participant's answer.")


if __name__ == "__main__":
    test_resume_workflow()
