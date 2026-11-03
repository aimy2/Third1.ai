from langchain_core.messages import HumanMessage, SystemMessage

from backend.third1_ai.models.schemas import (
    Case,
    Clarification,
    Verdict,
    InvestigatorOutput,
    EvidenceAuditOutput,
)
from backend.third1_ai.services.groq_client import llm
from backend.third1_ai.services.prompt_loader import load_prompt


AUDITOR_PROMPT = load_prompt("evidence_auditor_system.txt")

auditor_llm = llm.with_structured_output(EvidenceAuditOutput)


def audit_verdict(
    case: Case,
    verdict: Verdict,
    investigator_output: InvestigatorOutput,
    clarifications: list[Clarification] | None = None,
) -> EvidenceAuditOutput:

    clarifications = clarifications or []

    audit_context = {
        "original_case": case.model_dump(mode="json"),
        "clarifications": [
            item.model_dump(mode="json") for item in clarifications
        ],
        "investigator_findings": investigator_output.model_dump(mode="json"),
        "referee_verdict": verdict.model_dump(mode="json"),
    }

    messages = [
        SystemMessage(content=AUDITOR_PROMPT),
        HumanMessage(
            content=(
                "Audit the following verdict against the supplied case evidence. "
                "Return only the structured audit result.\n\n"
                f"AUDIT CONTEXT:\n{audit_context}"
            )
        ),
    ]

    return auditor_llm.invoke(messages)