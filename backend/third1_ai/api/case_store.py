from backend.third1_ai.graph.state import Third1State


# Temporary in-memory storage.
# The dictionary stays available while the backend process is running.
_case_store: dict[str, Third1State] = {}


def save_case_state(state: Third1State) -> None:
    """Save a case's complete workflow state."""

    case_id = state["case"].id

    if case_id in _case_store:
        raise ValueError(f"Case '{case_id}' already exists.")

    _case_store[case_id] = state


def get_case_state(case_id: str) -> Third1State:
    """Retrieve a case's complete workflow state."""

    if case_id not in _case_store:
        raise KeyError(f"Case '{case_id}' was not found.")

    return _case_store[case_id]


def update_case_state(
    case_id: str,
    updates: dict,
) -> Third1State:
    """Merge updates into an existing case state."""

    current_state = get_case_state(case_id)

    updated_state = {
        **current_state,
        **updates,
    }

    _case_store[case_id] = updated_state

    return updated_state