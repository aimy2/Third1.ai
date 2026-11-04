import json

from langchain_core.messages import HumanMessage, SystemMessage

from backend.third1_ai.models.schemas import (
    Case,
    Clarification,
    ClarificationStatus,
    InvestigatorOutput,
)
from backend.third1_ai.services.groq_client import llm
from backend.third1_ai.services.prompt_loader import load_prompt


# Load the Investigator's instructions once when this module is imported.
INVESTIGATOR_PROMPT = load_prompt("investigator_system.txt")


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

    # Count only answered clarifications.
    answered_count = sum(
        clarification.status == ClarificationStatus.ANSWERED
        for clarification in clarifications
    )

    case_context = {
        "case": case.model_dump(mode="json"),
        "previous_clarifications": [
            clarification.model_dump(mode="json")
            for clarification in clarifications
        ],
        "answered_clarifications_count": answered_count,
    }

    messages = [
        SystemMessage(content=INVESTIGATOR_PROMPT),
        HumanMessage(
            content=(
                "Investigate the following case using the supplied rules. "
                "Return only one valid JSON object matching the "
                "InvestigatorOutput schema. Do not include markdown, "
                "code fences, or additional text.\n\n"
                f"CASE CONTEXT:\n{case_context}"
            )
        ),
    ]

    # Get the raw response without LangChain structured-output parsing.
    response = llm.invoke(messages)

    if not isinstance(response.content, str):
        raise ValueError(
            "Investigator returned a non-text response. "
            f"Received: {type(response.content).__name__}"
        )

    # Convert the JSON text into a Python dictionary.
    try:
        result_data = json.loads(response.content)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Investigator returned invalid JSON. "
            f"Details: {error}"
        ) from error

    # Validate the dictionary against our Pydantic schema.
    return InvestigatorOutput.model_validate(result_data)
