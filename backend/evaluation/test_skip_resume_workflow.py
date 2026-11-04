from uuid import uuid4

from backend.evaluation.test_fixtures import create_test_case
from backend.third1_ai.graph.workflow import resume_workflow
from backend.third1_ai.services.clarification_service import skip_clarification
from backend.third1_ai.models.schemas import (
    Clarification,
    ClarificationStatus,
    ParticipantSpeaker,
)


def test_skip_and_resume():
    case, _ = create_test_case()

    clarification = Clarification(
        id=str(uuid4()),
        question="What agreement had both participants made beforehand?",
        target_speaker=ParticipantSpeaker.PARTICIPANT_01,
        reason="The prior agreement may affect the assessment.",
        status=ClarificationStatus.PENDING,
    )

    initial_state = {
        "case": case,
        "clarifications": [clarification],
        "investigator_output": None,
        "clarification_count": 0,
        "verdict": None,
    }

    # Mark the clarification as skipped.
    updates = skip_clarification(
        state=initial_state,
        clarification_id=clarification.id,
        participant=ParticipantSpeaker.PARTICIPANT_01,
    )

    print("\nClarification skipped. Resuming workflow...")

    # Resume using the updated clarification history.
    result = resume_workflow(
        current_state=initial_state,
        state_updates=updates,
    )

    print("\n========== SKIP AND RESUME RESULT ==========")
    print("Clarification status:", result["clarifications"][0].status.value)
    print("Answered clarifications:", result["clarification_count"])
    print("Investigator action:", result["investigator_output"].action.value)

    if result["investigator_output"].next_question:
        print("Next question:", result["investigator_output"].next_question.question)

    if result["verdict"]:
        print("Verdict:", result["verdict"].category.value)

    assert result["clarifications"][0].status == ClarificationStatus.SKIPPED
    assert result["clarification_count"] == 0

    print("\nPASS: Skipped clarification did not count, and workflow resumed.")


if __name__ == "__main__":
    test_skip_and_resume()
