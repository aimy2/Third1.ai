
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


class ParticipantAssessment(BaseModel):
    participant: ParticipantSpeaker

    strongest_valid_points: list[str] = Field(
        default_factory=list,
        description="The strongest points in this participant's position, grounded in the conversation."
    )

    weaknesses: list[str] = Field(
        default_factory=list,
        description="Specific weaknesses in this participant's reasoning, claims, or actions. Do not invent faults."
    )

    overall_assessment: str = Field(
        description="A fair assessment of this participant's position in the actual disagreement."
    )



class Verdict(BaseModel):
    category: VerdictCategory
    more_reasonable_participant: Optional[ParticipantSpeaker] = Field(
    description=(
         "The participant judged more reasonable. Must be participant_01 "
         "or participant_02 for an individual-winner verdict, and None "
         "for all other verdict categories."
    )
    )

    summary: str = Field(
        description="A concise statement of the overall verdict."
    )

    participant_assessments: list[ParticipantAssessment] = Field(
        description="Exactly one assessment for each participant."
    )

    supported_points: list[str] = Field(default_factory=list)
    disputed_points: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)

    reasoning: str = Field(
        description="Evidence-based explanation of why this verdict follows from the conversation."
    )

    recommendations: list[str] = Field(
        default_factory=list,
        description="Specific, practical recommendations addressing the actual disagreement."
    )

    closing_remark: str = Field(
        description="A short, natural Third1 AI closing remark. Humor is optional and must not undermine fairness."
    )

    @model_validator(mode="after")
    def validate_participant_assessments(self):
        participants = [
            assessment.participant
            for assessment in self.participant_assessments
        ]

        expected = {
            ParticipantSpeaker.PARTICIPANT_01,
            ParticipantSpeaker.PARTICIPANT_02,
        }

        if len(participants) != 2 or set(participants) != expected:
            raise ValueError(
                "A verdict must contain exactly one assessment for each participant."
            )
        if self.category == VerdictCategory.PERSON_A_MORE_REASONABLE:
            if self.more_reasonable_participant != ParticipantSpeaker.PARTICIPANT_01:
                raise ValueError(
                    "PERSON_A_MORE_REASONABLE requires participant_01."
                )

        elif self.category == VerdictCategory.PERSON_B_MORE_REASONABLE:
            if self.more_reasonable_participant != ParticipantSpeaker.PARTICIPANT_02:
                raise ValueError(
                    "PERSON_B_MORE_REASONABLE requires participant_02."
                )

        elif self.more_reasonable_participant is not None:
            raise ValueError(
                "The more reasonable participant must be None "
                "when there is no individual winner."
            )
        

        return self




class InvestigatorAction(str, Enum):
    ASK_CLARIFICATION = "ask_clarification"
    READY_FOR_VERDICT = "ready_for_verdict"


class ParticipantPosition(BaseModel):
    participant: ParticipantSpeaker

    stated_position: str = Field(
        description=(
            "The participant's current overall position, synthesized "
            "from their original statements and all clarification answers. "
            "Do not merely repeat their first statement."
        )
    )

    wants: list[str] = Field(
        default_factory=list,
        description="What the participant currently wants, based on their statements."
    )

    objections: list[str] = Field(
        default_factory=list,
        description="What the participant currently objects to, based on their statements."
    )


class DisputedClaim(BaseModel):
    claim: str = Field(
        description="The unresolved claim made by one participant."
    )

    made_by: ParticipantSpeaker

    conflicting_with: Optional[str] = Field(
        default=None,
        description="The opposing claim that conflicts with this claim."
    )

    conflicting_claim_by: Optional[ParticipantSpeaker] = Field(
        default=None,
        description="The participant who made the opposing claim."
    )


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


class EvidenceAuditOutput(BaseModel):
    is_consistent: bool = Field(
        description="Whether the verdict is internally consistent and supported by the case evidence."
    )

    issues: list[str] = Field(
        default_factory=list,
        description="Specific contradictions, unsupported claims, or evidence-handling errors."
    )

    revision_instructions: list[str] = Field(
        default_factory=list,
        description="Specific changes the Referee must make to resolve the identified issues."
    )

    @model_validator(mode="after")
    def validate_audit_result(self):
        if self.is_consistent and (self.issues or self.revision_instructions):
            raise ValueError(
                "A consistent verdict cannot contain audit issues or revision instructions."
            )

        if not self.is_consistent and not self.issues:
            raise ValueError(
                "An inconsistent verdict must identify at least one issue."
            )

        return self