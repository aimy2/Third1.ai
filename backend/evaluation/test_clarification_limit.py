from unittest.mock import patch

from backend.evaluation.test_fixtures import create_test_case
from backend.third1_ai.graph.nodes import investigator_node
from backend.third1_ai.models.schemas import (
    Clarification,
    ClarificationStatus,
    InvestigatorAction,
    InvestigatorOutput,
    InvestigatorQuestion,
    ParticipantPosition,
    ParticipantSpeaker,
)


def test_three_answered_limit():
    case, _ = create_test_case()

    # Simulate three clarifications that participants already answered.
    clarifications = [
        Clarification(
            id=f"clarification-{i}",
            question=f"Question {i}",
            target_speaker=ParticipantSpeaker.PARTICIPANT_01,
            reason="Test clarification",
            status=ClarificationStatus.ANSWERED,
            answer_message_id=f"answer-{i}",
        )
        for i in range(1, 4)
    ]

    state = {
        "case": case,
        "clarifications": clarifications,
        "investigator_output": None,
        "clarification_count": 3,
        "verdict": None,
    }

    # Simulate the Investigator requesting another question.
    simulated_output = InvestigatorOutput(
        dispute_summary="Test dispute",
        participant_positions=[
            ParticipantPosition(
                participant=ParticipantSpeaker.PARTICIPANT_01,
                stated_position="Position A",
                wants=[],
                objections=[],
            ),
            ParticipantPosition(
                participant=ParticipantSpeaker.PARTICIPANT_02,
                stated_position="Position B",
                wants=[],
                objections=[],
            ),
        ],
        established_information=[],
        disputed_claims=[],
        unknown_information=["One detail remains unknown."],
        action=InvestigatorAction.ASK_CLARIFICATION,
        next_question=InvestigatorQuestion(
            question="Should another question be asked?",
            target_speaker=ParticipantSpeaker.PARTICIPANT_02,
            reason="Test the clarification limit.",
        ),
    )

    # Replace the real API call with our simulated response.
    with patch(
        "backend.third1_ai.graph.nodes.investigate_case",
        return_value=simulated_output,
    ):
        result = investigator_node(state)

    print("\n========== THREE-ANSWER LIMIT TEST ==========")
    print("Answered clarifications:", state["clarification_count"])
    print("Final Investigator action:", result["investigator_output"].action.value)
    print("Next question:", result["investigator_output"].next_question)

    assert result["investigator_output"].action == InvestigatorAction.READY_FOR_VERDICT
    assert result["investigator_output"].next_question is None
    assert "clarifications" not in result

    print("\nPASS: A fourth clarification was prevented.")


if __name__ == "__main__":
    test_three_answered_limit()
