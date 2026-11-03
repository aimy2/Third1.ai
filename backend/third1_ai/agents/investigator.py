from langchain_core.messages import HumanMessage, SystemMessage

from backend.third1_ai.models.schemas import (
    Case,
    Clarification,
    InvestigatorOutput,
)
from backend.third1_ai.services.groq_client import llm
from backend.third1_ai.services.prompt_loader import load_prompt


# Load the Investigator's instructions once when this module is imported.
INVESTIGATOR_PROMPT = load_prompt("investigator_system.txt")


# Ask Groq to return data matching our Pydantic schema.
investigator_llm = llm.with_structured_output(InvestigatorOutput)


def investigate_case(
    case: Case,
    clarifications: list[Clarification] | None = None,
) -> InvestigatorOutput:
    """
    Investigate a case and return structured evidence analysis.

    This function does not issue a verdict or control the
    clarification-question limit.
    """

    clarifications = clarifications or []

    case_context = {
        "case": case.model_dump(mode="json"),
        "previous_clarifications": [
            clarification.model_dump(mode="json")
            for clarification in clarifications
        ],
        "clarification_questions_already_asked": len(clarifications),
    }

    messages = [
        SystemMessage(content=INVESTIGATOR_PROMPT),
        HumanMessage(
            content=(
                "Investigate the following case using the supplied rules. "
                "Return only the structured investigation output.\n\n"
                f"CASE CONTEXT:\n{case_context}"
            )
        ),
    ]

    result = investigator_llm.invoke(messages)

    return result