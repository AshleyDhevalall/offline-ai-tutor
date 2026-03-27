
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers';

let generator;
const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const status = document.getElementById("status");

status.innerText = "Ready";

async function initModel() {
  if (generator) return;
  status.innerText = "Downloading AI model (first time only)... This may take a moment.";

  try {
    generator = await pipeline('text-generation', 'Xenova/distilgpt2');
    status.innerText = "Model ready (offline capable)";
  } catch (error) {
    console.error("Failed to load model:", error);
    status.innerText = "Error loading model. Please try again or refresh the page.";
    throw error;
  }
}

document.getElementById("sendBtn").onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";

  const typingDiv = appendMessage("ai", "Thinking...");
  typingDiv.classList.add("typing");
  input.disabled = true;

  try {
    await initModel();

    typingDiv.classList.remove("typing");
    typingDiv.innerText = "";

    // Prepare the prompt for the AI
    const systemPrompt = "You are a helpful tutor. Provide clear, step-by-step guidance without giving away the final answer. Keep responses concise (2-3 sentences).";
    const prompt = `${systemPrompt}\n\nStudent: ${text}\nTutor: `;

    let fullText = "";

    // Generate response
    const output = await generator(prompt, {
      max_new_tokens: 100,
      temperature: 0.7,
      top_p: 0.9
    });

    // Extract generated text
    const generatedText = output[0].generated_text.replace(prompt, "").trim();
    
    // Simulate streaming by displaying character by character
    for (let i = 0; i < generatedText.length; i++) {
      fullText += generatedText[i];
      typingDiv.innerText = fullText;
      // Small delay for smooth typing effect
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  } catch (error) {
    console.error("Error during chat:", error);
    typingDiv.classList.remove("typing");
    typingDiv.innerText = "Sorry, an error occurred. Please try again.";
  } finally {
    input.disabled = false;
    input.focus();
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
