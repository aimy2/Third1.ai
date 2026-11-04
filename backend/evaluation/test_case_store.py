from backend.evaluation.test_fixtures import create_test_case
from backend.third1_ai.api.case_store import (
    save_case_state,
    get_case_state,
    update_case_state,
)


def test_case_store():
    case, _ = create_test_case()

    initial_state = {
        "case": case,
        "clarifications": [],
        "investigator_output": None,
        "clarification_count": 0,
        "verdict": None,
    }

    # 1. Save a new case.
    save_case_state(initial_state)

    # 2. Retrieve the saved case.
    retrieved_state = get_case_state(case.id)

    assert retrieved_state["case"].id == case.id
    assert retrieved_state["clarification_count"] == 0

    # 3. Update the case state.
    updated_state = update_case_state(
        case.id,
        {"clarification_count": 1},
    )

    assert updated_state["clarification_count"] == 1

    # 4. Confirm the update was actually stored.
    stored_state = get_case_state(case.id)

    assert stored_state["clarification_count"] == 1
    assert stored_state["case"].id == case.id

    # 5. Check that duplicate case creation is rejected.
    try:
        save_case_state(initial_state)
    except ValueError:
        pass
    else:
        raise AssertionError("Duplicate case was not rejected.")

    # 6. Check that an unknown case ID is rejected.
    try:
        get_case_state("nonexistent-case")
    except KeyError:
        pass
    else:
        raise AssertionError("Unknown case ID was not rejected.")

    print("PASS: Case saved and retrieved.")
    print("PASS: Case state updated and persisted.")
    print("PASS: Duplicate case rejected.")
    print("PASS: Unknown case ID rejected.")


if __name__ == "__main__":
    test_case_store()