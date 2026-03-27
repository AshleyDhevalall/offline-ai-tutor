
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
    // Use a larger model with better generation quality for instruction-like responses
    generator = await pipeline('text-generation', 'Xenova/bloom-1b1');
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

    // Explicit instruction prompt for tutor behavior
    const prompt = `You are an expert tutor. Provide a short, clear answer in 1-2 sentences and do not repeat yourself.\nQuestion: ${text}\nAnswer:`;

    let fullText = "";

    // Generate response
    const output = await generator(prompt, {
      max_new_tokens: 70,
      temperature: 0.65,
      top_p: 0.85,
      do_sample: true,
      repetition_penalty: 1.2
    });

    // Extract generated text and clean it up
    let generatedText = output[0].generated_text;
    
    // Remove the prompt from the output
    generatedText = generatedText.replace(prompt, "").trim();
    
    // Remove repeated phrases/sentences
    const words = generatedText.split(/\s+/);
    const uniqueWords = [];
    const seenPhrases = new Set();
    
    for (let i = 0; i < words.length; i++) {
      // Get 3-word phrases to detect repetition
      const phrase = words.slice(Math.max(0, i - 2), i + 1).join(" ").toLowerCase();
      
      if (!seenPhrases.has(phrase)) {
        uniqueWords.push(words[i]);
        seenPhrases.add(phrase);
      }
    }
    
    generatedText = uniqueWords.join(" ").trim();
    
    // Remove multiple newlines and extra spaces
    generatedText = generatedText.replace(/\n{2,}/g, " ");
    generatedText = generatedText.replace(/\s{2,}/g, " ");
    
    // Take only first 1-2 sentences
    const sentences = generatedText.match(/[^.!?]+[.!?]+/g) || [generatedText];
    generatedText = sentences.slice(0, 2).join(" ").trim();
    
    // Limit length
    if (generatedText.length > 250) {
      generatedText = generatedText.substring(0, 250).trim() + "...";
    }
    
    // Clean up common artifacts
    if (!generatedText || generatedText.length < 5) {
      generatedText = "Think about what you just learned. What questions do you have?";
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
