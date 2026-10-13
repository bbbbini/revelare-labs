"use strict";

// Turns an OpenAI-style message list into one prompt for a one-shot CLI call.

const extractText = (content) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""))
      .join("");
  }
  return "";
};

const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : message?.role === "system" ? "system" : "user",
      text: extractText(message?.content).trim(),
    }))
    .filter((message) => message.text);
};

const buildPreamble = (researcher) =>
  [
    `You are ${researcher.name} (${researcher.id}), a security researcher at REVELARE Security Labs.`,
    "Answer the operator's latest message directly and concisely.",
    "Reply in the language the operator uses.",
  ].join(" ");

// Keeps the newest messages that fit in maxChars; the latest user message is
// always kept (truncated from the front if it alone is too long).
const buildPrompt = ({ messages, researcher, maxChars }) => {
  const normalized = normalizeMessages(messages);
  const last = normalized[normalized.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("The last message must be a non-empty user message.");
  }
  const preamble = buildPreamble(researcher);
  const label = { user: "Operator", assistant: researcher.name, system: "System" };
  const render = (message) => `${label[message.role]}: ${message.text}`;

  let budget = Math.max(0, maxChars - preamble.length - 64);
  let lastText = render(last);
  if (lastText.length > budget) lastText = lastText.slice(lastText.length - budget);
  budget -= lastText.length;

  const history = [];
  for (let index = normalized.length - 2; index >= 0; index -= 1) {
    const line = render(normalized[index]);
    if (line.length + 2 > budget) break;
    history.unshift(line);
    budget -= line.length + 2;
  }

  return [
    preamble,
    history.length ? `Conversation so far:\n\n${history.join("\n\n")}` : null,
    `Latest message:\n\n${lastText}`,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
};

module.exports = { buildPrompt, normalizeMessages };
