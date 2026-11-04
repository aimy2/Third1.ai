import json

from backend.third1_ai.models.schemas import InvestigatorOutput

raw = {
    "dispute_summary": "Test dispute",
    "participant_positions": [
        {
            "participant": "participant_01",
            "stated_position": "Position A",
            "wants": [],
            "objections": [],
        },
        {
            "participant": "participant_02",
            "stated_position": "Position B",
            "wants": [],
            "objections": [],
        },
    ],
    "established_information": [],
    "disputed_claims": [],
    "unknown_information": [],
    "action": "ready_for_verdict",
    "next_question": None,
}

result = InvestigatorOutput.model_validate(raw)

print(result)
print("\nPASS: JSON data validated successfully.")
