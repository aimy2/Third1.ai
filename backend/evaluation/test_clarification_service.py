from backend.third1_ai.models.schemas import (
    Case,
    Participant,
    ParticipantSpeaker,
    Clarification,
    ClarificationStatus,
)
from backend.third1_ai.graph.state import Third1State
from backend.third1_ai.services.clarification_service import (
    answer_clarification,
    skip_clarification,
)


def create_state():
    case = Case(
        id="test-case-01",
        title="Test disagreement",
        participant_01=Participant(
            id=ParticipantSpeaker.PARTICIPANT_01,
            name="Alex",
        ),
        participant_02=Participant(
            id=ParticipantSpeaker.PARTICIPANT_02,
            name="Sam",
        ),
        messages=[],
    )

    clarification = Clarification(
        id="question-01",
        question="What exactly happened?",
        target_speaker=ParticipantSpeaker.PARTICIPANT_01,
        reason="The timeline is unclear.",
    )

    return {
        "case": case,
        "clarifications": [clarification],
        "investigator_output": None,
        "clarification_count": 0,
        "verdict": None,
    }


def test_answer():
    state = create_state()

    updated = answer_clarification(
        state=state,
        clarification_id="question-01",
        participant=ParticipantSpeaker.PARTICIPANT_01,
        answer="The disagreement happened yesterday.",
    )

    clarification = updated["clarifications"][0]

    assert clarification.status == ClarificationStatus.ANSWERED
    assert updated["clarification_count"] == 1
    assert len(updated["case"].messages) == 1
    assert updated["case"].messages[0].clarification_id == "question-01"

    print("PASS: Answer updates status, message history and counter.")


def test_skip():
    state = create_state()

    updated = skip_clarification(
        state=state,
        clarification_id="question-01",
        participant=ParticipantSpeaker.PARTICIPANT_01,
    )

    assert updated["clarifications"][0].status == ClarificationStatus.SKIPPED
    assert updated["clarification_count"] == 0
    assert len(state["case"].messages) == 0

    print("PASS: Skip updates status without adding a message or counting.")


def test_wrong_participant():
    state = create_state()

    try:
        answer_clarification(
            state=state,
            clarification_id="question-01",
            participant=ParticipantSpeaker.PARTICIPANT_02,
            answer="I want to answer this.",
        )
    except ValueError:
        print("PASS: Wrong participant is rejected.")
    else:
        raise AssertionError("Wrong participant was incorrectly accepted.")


if __name__ == "__main__":
    test_answer()
    test_skip()
    test_wrong_participant()
    print("\\nAll clarification service tests passed.")
