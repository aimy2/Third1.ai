from backend.evaluation.test_fixtures import create_test_case
from backend.third1_ai.graph.workflow import third1_graph


def test_workflow():
    case, _ = create_test_case()

    initial_state = {
        "case": case,
        "clarifications": [],
        "investigator_output": None,
        "clarification_count": 0,
        "verdict": None,
    }

    result = third1_graph.invoke(initial_state)

    print("\n========== WORKFLOW RESULT ==========")
    print("Investigator:", result["investigator_output"].action.value)
    print("Verdict:", result["verdict"].category.value)
    print("Summary:", result["verdict"].summary)

    return result


if __name__ == "__main__":
    test_workflow()