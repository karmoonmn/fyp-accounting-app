"""Message Trimmer — keeps conversation history manageable.

Implements a "summarize-then-trim" strategy:

1. Full history stays in the SQLite checkpoint (audit trail).
2. Before sending to the LLM, we trim the messages list:
   - If > MAX_RECENT messages, summarize the older messages into a
     single SystemMessage.
   - Keep only the summary + the last MAX_RECENT messages.
3. This way, even after 100+ turns, each LLM call sees ~12 messages
   (1 summary + 10 recent + 1 system prompt).

Usage in agents:

    from app.utils.message_trimmer import trim_messages_for_llm

    messages = [SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
    messages = await trim_messages_for_llm(messages)
    response = await model.ainvoke(messages)
"""

from __future__ import annotations

import logging
from typing import Optional

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.utils.llm import get_resilient_model
from app.utils.llm_retry import invoke_with_retry

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

# When the message count exceeds this, we summarize older messages
MAX_RECENT_MESSAGES = 30

# How many messages to keep as-is (the most recent ones)
KEEP_LAST_N = 10

# Summarization prompt
SUMMARY_SYSTEM_PROMPT = """\
You are a concise summarizer. Summarize the following conversation history
into a brief paragraph (3-5 sentences max). Focus on:
- What the user asked for
- What actions were taken (invoices created, bills viewed, etc.)
- Any important data (customer names, amounts, IDs)
- The current state of the conversation

Be specific with numbers, names, and IDs. Do NOT include greetings or filler.
"""


def _get_summary_model():
    return get_resilient_model(temperature=0.0)


def _is_tool_message(msg: BaseMessage) -> bool:
    """Check if a message is a ToolMessage (from tool calling)."""
    return isinstance(msg, ToolMessage)


def _has_tool_calls(msg: BaseMessage) -> bool:
    """Check if an AIMessage contains tool calls."""
    return isinstance(msg, AIMessage) and bool(getattr(msg, "tool_calls", None))


def _find_safe_split_point(messages: list[BaseMessage], target_idx: int) -> int:
    """
    Find a safe point to split messages, ensuring we don't break
    AIMessage(tool_calls) / ToolMessage pairs.

    We walk backwards from target_idx to find a point where the next
    message is NOT a ToolMessage (which would be orphaned without its
    preceding AIMessage).
    """
    idx = target_idx
    while idx > 0:
        next_msg = messages[idx] if idx < len(messages) else None
        if next_msg and (_is_tool_message(next_msg) or _has_tool_calls(next_msg)):
            idx -= 1
        else:
            break
    return idx


def _format_messages_for_summary(messages: list[BaseMessage]) -> str:
    """Format messages into a readable string for summarization."""
    parts = []
    for msg in messages:
        if isinstance(msg, SystemMessage):
            continue  # Skip system prompts from summary input
        elif isinstance(msg, HumanMessage):
            parts.append(f"User: {msg.content}")
        elif isinstance(msg, AIMessage):
            if _has_tool_calls(msg):
                tool_names = [tc.get("name", "?") for tc in msg.tool_calls]
                parts.append(f"AI: [Called tools: {', '.join(tool_names)}]")
            elif msg.content:
                # Truncate long AI responses
                content = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
                parts.append(f"AI: {content}")
        elif isinstance(msg, ToolMessage):
            # Truncate tool results
            content = msg.content[:200] + "..." if len(msg.content) > 200 else msg.content
            parts.append(f"Tool Result: {content}")
    return "\n".join(parts)


async def _summarize_messages(messages: list[BaseMessage]) -> str:
    """Use Gemini to summarize a list of messages into a brief paragraph."""
    model = _get_summary_model()
    formatted = _format_messages_for_summary(messages)

    if not formatted.strip():
        return "No significant prior conversation."

    try:
        response = await invoke_with_retry(model.ainvoke, [
            SystemMessage(content=SUMMARY_SYSTEM_PROMPT),
            HumanMessage(content=f"Conversation to summarize:\n\n{formatted}"),
        ])
        summary = response.content.strip()
        logger.info(
            "Summarized %d messages into %d chars",
            len(messages), len(summary),
        )
        return summary
    except Exception as e:
        logger.warning("Summarization failed (%s), using fallback", e)
        # Fallback: just keep last few user messages as context
        user_msgs = [m.content for m in messages if isinstance(m, HumanMessage)]
        return "Previous topics: " + "; ".join(user_msgs[-3:])


async def trim_messages_for_llm(
    messages: list[BaseMessage],
    max_recent: int = MAX_RECENT_MESSAGES,
    existing_summary: Optional[str] = None,
) -> tuple[list[BaseMessage], Optional[str]]:
    """
    Trim a message list for LLM consumption.

    Parameters
    ----------
    messages : list[BaseMessage]
        Full message list (system prompt + conversation history).
    max_recent : int
        Maximum number of recent messages to keep verbatim.
    existing_summary : str | None
        If a summary was already generated in a prior turn, reuse it
        and only summarize the new "overflow" messages.

    Returns
    -------
    tuple[list[BaseMessage], str | None]
        (trimmed_messages, updated_summary)

    The returned list always has this structure:
        [SystemMessage(original prompt)]
        [SystemMessage(conversation summary)]  ← only if trimmed
        [last N messages]
    """
    # Separate system messages from conversation messages
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    convo_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

    # If within limits, no trimming needed
    if len(convo_msgs) <= max_recent:
        return messages, existing_summary

    logger.info(
        "Trimming messages: %d total → keeping last %d + summary",
        len(convo_msgs), max_recent,
    )

    # Find safe split point (don't break tool call pairs)
    split_at = _find_safe_split_point(convo_msgs, len(convo_msgs) - max_recent)
    old_msgs = convo_msgs[:split_at]
    recent_msgs = convo_msgs[split_at:]

    # Generate or extend summary
    if old_msgs:
        if existing_summary:
            # Prepend existing summary as context for the new summarization
            old_msgs_with_context = [
                SystemMessage(content=f"Previous summary: {existing_summary}")
            ] + old_msgs
            new_summary = await _summarize_messages(old_msgs_with_context)
        else:
            new_summary = await _summarize_messages(old_msgs)
    else:
        new_summary = existing_summary

    # Rebuild the message list
    result = list(system_msgs)  # Keep original system prompts
    if new_summary:
        result.append(
            SystemMessage(content=f"📝 Previous conversation summary:\n{new_summary}")
        )
    result.extend(recent_msgs)

    logger.info(
        "Trimmed: %d → %d messages (summary: %s chars)",
        len(messages), len(result),
        len(new_summary) if new_summary else 0,
    )

    return result, new_summary


def prepare_messages_for_llm(
    system_prompt: str,
    state_messages: list[BaseMessage],
    conversation_summary: str | None = None,
    max_recent: int = MAX_RECENT_MESSAGES,
) -> list[BaseMessage]:
    """
    Build a trimmed message list for an LLM call (NO async, NO LLM call).

    This is the function agents should use. It assembles:
      [SystemMessage(system_prompt)]
      [SystemMessage(conversation_summary)]  ← if available
      [last N conversation messages]

    The conversation_summary was pre-computed by the ``trim_history_node``
    in the workflow, so this function is cheap and synchronous.

    Parameters
    ----------
    system_prompt : str
        The agent's system prompt.
    state_messages : list[BaseMessage]
        The full ``state["messages"]`` list from the graph.
    conversation_summary : str | None
        Pre-computed summary from ``state["conversation_summary"]``.
    max_recent : int
        Max recent conversation messages to keep.

    Returns
    -------
    list[BaseMessage]
        Ready-to-send message list for model.ainvoke().
    """
    # Separate any existing system messages from conversation messages
    convo_msgs = [m for m in state_messages if not isinstance(m, SystemMessage)]

    # Build result
    result: list[BaseMessage] = [SystemMessage(content=system_prompt)]

    # Inject summary if history is long and summary exists
    if conversation_summary and len(convo_msgs) > max_recent:
        result.append(
            SystemMessage(
                content=f"📝 Previous conversation summary:\n{conversation_summary}"
            )
        )
        # Only keep last N messages
        split_at = _find_safe_split_point(convo_msgs, len(convo_msgs) - max_recent)
        convo_msgs = convo_msgs[split_at:]

    result.extend(convo_msgs)
    return result
