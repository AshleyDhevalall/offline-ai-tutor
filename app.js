
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine;
const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const status = document.getElementById("status");

async function initModel() {
  if (engine) return;
  status.innerText = "Downloading AI model (first time only)...";

  engine = await webllm.CreateMLCEngine({
    model: "TinyLlama-1.1B-Chat-v1.0-q4f16_1"
  });

  status.innerText = "Model ready (offline capable)";
}

document.getElementById("sendBtn").onclick = async () => {
  const text = input.value;
  if (!text) return;

  appendMessage("user", text);
  input.value = "";

  const aiDiv = appendMessage("ai", "...");

  await initModel();

  let fullText = "";

  const completion = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a tutor. Guide step-by-step. Never give final answers."
      },
      { role: "user", content: text }
    ],
    stream: true
  });

  for await (const chunk of completion) {
    const token = chunk.choices[0]?.delta?.content || "";
    fullText += token;
    aiDiv.innerText = fullText;
  }
};

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
