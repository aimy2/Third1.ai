from typing import TypedDict

from backend.third1_ai.models.schemas import (
    Case,
    Clarification,
    InvestigatorOutput,
    Verdict,
)


class Third1State(TypedDict):
    # Original case submitted by the participants
    case: Case

    # Clarification history
    clarifications: list[Clarification]

    # Investigator's latest findings
    investigator_output: InvestigatorOutput | None

    # Number of clarifications answered by participants (maximum 3)
    clarification_count: int

    # Final Referee decision
    verdict: Verdict | None