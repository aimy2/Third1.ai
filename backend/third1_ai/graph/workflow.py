
from langgraph.graph import StateGraph, START, END

from backend.third1_ai.graph.state import Third1State
from backend.third1_ai.graph.nodes import (
    investigator_node,
    referee_node,
)
from backend.third1_ai.models.schemas import InvestigatorAction


def route_after_investigator(state: Third1State) -> str:
    action = state["investigator_output"].action

    if action == InvestigatorAction.ASK_CLARIFICATION:
        return "end"

    return "referee"


def build_graph():
    builder = StateGraph(Third1State)

    builder.add_node("investigator", investigator_node)
    builder.add_node("referee", referee_node)

    builder.add_edge(START, "investigator")

    builder.add_conditional_edges(
        "investigator",
        route_after_investigator,
        {
            "end": END,
            "referee": "referee",
        },
    )

    builder.add_edge("referee", END)

    return builder.compile()


third1_graph = build_graph()


def resume_workflow(
    current_state: Third1State,
    state_updates: dict,
) -> Third1State:
    """
    Merge clarification updates into the existing state
    and run the graph again from START.
    """

    updated_state = {
        **current_state,
        **state_updates,
    }

    return third1_graph.invoke(updated_state)
