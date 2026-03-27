
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine;
const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const status = document.getElementById("status");

status.innerText = "Ready";

// Check for WebGPU support
if (!navigator.gpu) {
  status.innerText = "WebGPU not supported. Please use a compatible browser (Chrome/Edge on desktop).";
}

async function initModel() {
  if (engine) return;
  status.innerText = "Downloading AI model (first time only)...";

  try {
    engine = await webllm.CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    status.innerText = "Model ready (offline capable)";
  } catch (error) {
    console.error("Failed to load model:", error);
    status.innerText = "Error loading model. Please check browser compatibility.";
    throw error;
  }
}

document.getElementById("sendBtn").onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";

  const typingDiv = appendMessage("ai", "Typing...");
  typingDiv.classList.add("typing");

  try {
    await initModel();

    typingDiv.classList.remove("typing");
    typingDiv.innerText = "";

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
      typingDiv.innerText = fullText;
    }
  } catch (error) {
    console.error("Error during chat:", error);
    typingDiv.classList.remove("typing");
    typingDiv.innerText = "Sorry, an error occurred. Please try again.";
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

input.focus();

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.keyCode === 13) {
    e.preventDefault();
    document.getElementById("sendBtn").click();
  }
});
