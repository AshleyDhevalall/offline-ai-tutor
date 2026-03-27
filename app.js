
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

    // Simple prompt - avoid repetition
    const prompt = `Q: ${text}\nA:`;

    let fullText = "";

    // Generate response
    const output = await generator(prompt, {
      max_new_tokens: 80,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true
    });

    // Extract generated text and clean it up
    let generatedText = output[0].generated_text;
    
    // Remove the prompt from the output
    generatedText = generatedText.replace(prompt, "").trim();
    
    // Remove common repetitions
    generatedText = generatedText.replace(/\n{2,}/g, "\n"); // Remove multiple newlines
    generatedText = generatedText.split("\n")[0]; // Take only first line/paragraph
    
    // If text is too long, truncate at sentence boundary
    if (generatedText.length > 300) {
      const sentences = generatedText.match(/[^.!?]+[.!?]+/g) || [generatedText];
      generatedText = sentences.slice(0, 2).join(" ").trim();
    }
    
    // Clean up common artifacts
    if (!generatedText) {
      generatedText = "I'm thinking about that. Could you be more specific?";
    }
    
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
