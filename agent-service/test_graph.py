import asyncio
from typing_extensions import TypedDict
from typing import Optional, Literal
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
    prop1: str
    prop2: Optional[str]

def node1(state: State):
    return {"prop1": "val1", "prop2": "val2"}

def node2(state: State):
    return {"prop1": "new_val1"}

async def test():
    builder = StateGraph(State)
    builder.add_node("node1", node1)
    builder.add_node("node2", node2)
    builder.add_edge(START, "node1")
    builder.add_edge("node1", "node2")
    builder.add_edge("node2", END)
    graph = builder.compile()
    
    result = await graph.ainvoke({"prop1": "init1", "prop2": "init2"})
    print(result)

if __name__ == "__main__":
    asyncio.run(test())
