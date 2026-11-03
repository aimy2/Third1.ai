
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class SpeakerType(str, Enum):
    PARTICIPANT_01 = "participant_01"
    PARTICIPANT_02 = "participant_02"
    AI = "ai"
    SYSTEM = "system"


class ParticipantSpeaker(str, Enum):
    PARTICIPANT_01 = "participant_01"
    PARTICIPANT_02 = "participant_02"


class MessageType(str, Enum):
    TESTIMONY = "testimony"
    CLARIFICATION_QUESTION = "clarification_question"
    CLARIFICATION_ANSWER = "clarification_answer"
    SYSTEM_EVENT = "system_event"


class ClarificationStatus(str, Enum):
    PENDING = "pending"
    ANSWERED = "answered"
    SKIPPED = "skipped"


class VerdictCategory(str, Enum):
    PERSON_A_MORE_REASONABLE = "person_a_more_reasonable"
    PERSON_B_MORE_REASONABLE = "person_b_more_reasonable"
    BOTH_WRONG = "both_wrong"
    BOTH_HAVE_VALID_POINTS = "both_have_valid_points"
    INSUFFICIENT_INFORMATION = "insufficient_information"


class Participant(BaseModel):
    id: ParticipantSpeaker
    name: str = Field(min_length=1, max_length=100)


class Message(BaseModel):
    id: str
    speaker: SpeakerType
    content: str = Field(min_length=1)
    message_type: MessageType = MessageType.TESTIMONY
    clarification_id: Optional[str] = None
    timestamp: Optional[str] = None


class Case(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=200)
    participant_01: Participant
    participant_02: Participant
    messages: list[Message] = Field(default_factory=list)


class Clarification(BaseModel):
    id: str
    question: str = Field(min_length=1)
    target_speaker: ParticipantSpeaker
    reason: str = Field(min_length=1)
    status: ClarificationStatus = ClarificationStatus.PENDING
    answer_message_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_answer_reference(self):
        if self.status == ClarificationStatus.ANSWERED:
            if not self.answer_message_id:
                raise ValueError(
                    "An answered clarification must have an answer message ID."
                )

        elif self.answer_message_id is not None:
            raise ValueError(
                "Only answered clarifications can have an answer message ID."
            )

        return self

class Verdict(BaseModel):
    category: VerdictCategory
    summary: str
    reasoning: str
    recommendations: list[str] = Field(default_factory=list)


class InvestigatorAction(str, Enum):
    ASK_CLARIFICATION = "ask_clarification"
    READY_FOR_VERDICT = "ready_for_verdict"


class ParticipantPosition(BaseModel):
    participant: ParticipantSpeaker
    stated_position: str
    wants: list[str] = Field(default_factory=list)
    objections: list[str] = Field(default_factory=list)


class DisputedClaim(BaseModel):
    claim: str
    made_by: ParticipantSpeaker
    conflicting_with: Optional[str] = None


class InvestigatorQuestion(BaseModel):
    question: str = Field(min_length=1)
    target_speaker: ParticipantSpeaker
    reason: str = Field(min_length=1)


class InvestigatorOutput(BaseModel):
    dispute_summary: str
    participant_positions: list[ParticipantPosition]
    established_information: list[str] = Field(default_factory=list)
    disputed_claims: list[DisputedClaim] = Field(default_factory=list)
    unknown_information: list[str] = Field(default_factory=list)

    action: InvestigatorAction
    next_question: Optional[InvestigatorQuestion] = None

    @model_validator(mode="after")
    def validate_action_and_question(self):
        if self.action == InvestigatorAction.ASK_CLARIFICATION:
            if self.next_question is None:
                raise ValueError(
                    "A clarification question is required when action is ask_clarification."
                )

        elif self.next_question is not None:
            raise ValueError(
                "next_question must be None when action is ready_for_verdict."
            )

        return self
