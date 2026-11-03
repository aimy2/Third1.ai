from langchain_core.messages import HumanMessage, SystemMessage

from backend.third1_ai.models.schemas import (
    Case,
    Clarification,
    InvestigatorOutput,
    Verdict,
)
from backend.third1_ai.services.groq_client import llm
from backend.third1_ai.services.prompt_loader import load_prompt


REFEREE_PROMPT = load_prompt("referee_system.txt")

referee_llm = llm.with_structured_output(Verdict)


def evaluate_case(
    case: Case,
    investigator_output: InvestigatorOutput,
    clarifications: list[Clarification] | None = None,
    revision_instructions: list[str] | None = None,
) -> Verdict:

    clarifications = clarifications or []
    revision_instructions = revision_instructions or []

    evaluation_context = {
        "original_case": case.model_dump(mode="json"),
        "clarifications": [
            item.model_dump(mode="json") for item in clarifications
        ],
        "investigator_findings": investigator_output.model_dump(mode="json"),
        "revision_instructions": revision_instructions,
    }

    messages = [
        SystemMessage(content=REFEREE_PROMPT),
        HumanMessage(
            content=(
                "Evaluate the case using the supplied evidence and return "
                "a structured Verdict.\n\n"
                f"EVALUATION CONTEXT:\n{evaluation_context}"
            ),
        ),
    ]

    return referee_llm.invoke(messages)