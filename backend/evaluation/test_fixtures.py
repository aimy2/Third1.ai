
from backend.third1_ai.models.schemas import (
    Case,
    Participant,
    Message,
    ParticipantSpeaker,
    SpeakerType,
    MessageType,
    ParticipantPosition,
    InvestigatorOutput,
    InvestigatorAction,
)


def create_test_case():
    amy = Participant(
        id=ParticipantSpeaker.PARTICIPANT_01,
        name="Amy",
    )

    nain = Participant(
        id=ParticipantSpeaker.PARTICIPANT_02,
        name="Nain",
    )

    messages = [
        Message(
            id="m1",
            speaker=SpeakerType.PARTICIPANT_01,
            content="We agreed that Nain would pick me up at 6 PM.",
            message_type=MessageType.TESTIMONY,
        ),
        Message(
            id="m2",
            speaker=SpeakerType.PARTICIPANT_01,
            content="I waited until 6:45 PM. He never arrived or contacted me.",
            message_type=MessageType.TESTIMONY,
        ),
        Message(
            id="m3",
            speaker=SpeakerType.PARTICIPANT_01,
            content="I missed my appointment because I was waiting.",
            message_type=MessageType.TESTIMONY,
        ),
        Message(
            id="m4",
            speaker=SpeakerType.PARTICIPANT_02,
            content="Yes, I agreed to pick you up at 6 PM.",
            message_type=MessageType.TESTIMONY,
        ),
        Message(
            id="m5",
            speaker=SpeakerType.PARTICIPANT_02,
            content="I forgot. I was playing games and didn't realize how late it had become.",
            message_type=MessageType.TESTIMONY,
        ),
    ]

    case = Case(
        id="test_001",
        title="The Missed Pickup",
        participant_01=amy,
        participant_02=nain,
        messages=messages,
    )

    investigator_output = InvestigatorOutput(
        dispute_summary=(
            "Nain agreed to pick Amy up at 6 PM but forgot. "
            "Amy waited until 6:45 PM and reports missing her appointment."
        ),
        participant_positions=[
            ParticipantPosition(
                participant=ParticipantSpeaker.PARTICIPANT_01,
                stated_position="Amy expected Nain to pick her up at 6 PM.",
                wants=["Acknowledgment of the missed pickup"],
                objections=["Nain failed to arrive or contact her"],
            ),
            ParticipantPosition(
                participant=ParticipantSpeaker.PARTICIPANT_02,
                stated_position="Nain agreed to the pickup but forgot.",
                wants=["Understanding of his mistake"],
                objections=[],
            ),
        ],
        established_information=[
            "Both participants acknowledge the 6 PM pickup agreement.",
            "Amy reports waiting until 6:45 PM.",
            "Nain admits forgetting the pickup.",
        ],
        disputed_claims=[],
        unknown_information=[
            "Whether Nain attempted to contact Amy after realizing he had forgotten."
        ],
        action=InvestigatorAction.READY_FOR_VERDICT,
        next_question=None,
    )

    return case, investigator_output
