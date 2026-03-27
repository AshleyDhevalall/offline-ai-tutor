
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers';

let generator;
const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const status = document.getElementById("status");

status.innerText = "Ready";

async function initModel() {
  if (generator) return;
  status.innerText = "Downloading AI model (first time only)... This may take a moment.";

  const models = [
    'Xenova/stablelm-tiny',
    'Xenova/stablelm-base',
    'Xenova/distilgpt2',
    'Xenova/gpt2'
  ];

  for (const model of models) {
    try {
      generator = await pipeline('text-generation', model);
      status.innerText = `Model ready (offline capable) - ${model}`;
      return;
    } catch (error) {
      console.warn(`Model ${model} failed, trying next...`, error);
    }
  }

  status.innerText = "All model loads failed. Please refresh and try again.";
  throw new Error('No available model loaded');
}

document.getElementById("sendBtn").onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";

  // Instant deterministic fallback for simple math and trivia
  const mathMatch = text.match(/^\s*([-+]?[0-9]+(?:\.[0-9]+)?)\s*([+\-*/])\s*([-+]?[0-9]+(?:\.[0-9]+)?)\s*$/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b === 0 ? 'undefined' : a / b; break;
      default: result = 'Unknown operation';
    }
    appendMessage("ai", `${a} ${op} ${b} = ${result}`);
    return;
  }

  const typingDiv = appendMessage("ai", "Thinking...");
  typingDiv.classList.add("typing");
  input.disabled = true;

  try {
    await initModel();

    typingDiv.classList.remove("typing");
    typingDiv.innerText = "";

    // Strong instruction prompt with few-shot examples
    const prompt = `You are an expert AI math/personal tutor. Answer questions clearly in 1-2 sentences without unrelated text.\n\nExample:\nQ: What is 2+2?\nA: 2+2 equals 4.\n\nQ: ${text}\nA:`;

    let fullText = "";

    // Generate response
    const output = await generator(prompt, {
      max_new_tokens: 70,
      temperature: 0.2,
      top_p: 0.9,
      repetition_penalty: 1.05,
      do_sample: true,
      stop: ['\nQ', 'Q:']
    });

    // Extract generated text and clean up
    let generatedText = output[0].generated_text || '';
    generatedText = generatedText.replace(prompt, "").trim();

    // Remove multiple newlines and repeated whitespace
    generatedText = generatedText.replace(/\n{2,}/g, " ").replace(/\s{2,}/g, " ").trim();

    // Avoid accidental echo of question text
    if (generatedText.toLowerCase().startsWith(text.toLowerCase())) {
      generatedText = generatedText.substring(text.length).trim();
    }

    // Keep first 1-2 sentences
    const sentences = generatedText.match(/[^.!?]+[.!?]+/g) || [generatedText];
    generatedText = sentences.slice(0, 2).join(" ").trim();

    // Enforce minimum and max lengths
    if (generatedText.length > 240) {
      generatedText = generatedText.substring(0, 240).trim();
      if (!/[.!?]$/.test(generatedText)) generatedText += '.';
    }

    if (!generatedText || generatedText.length < 5) {
      generatedText = "Sorry, I didn't understand. Could you rephrase your question?";
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

function setAppViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setAppViewportHeight();

const viewportChangeTarget = window.visualViewport || window;
viewportChangeTarget.addEventListener('resize', setAppViewportHeight);

window.addEventListener('orientationchange', setAppViewportHeight);

window.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    input.blur();
  } else {
    setTimeout(() => {
      setAppViewportHeight();
      input.blur();
      // Do not auto-focus on return, user must tap to show keyboard.
    }, 100);
  }
});

// Do not auto-focus on load to prevent keyboard jump on mobile.

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.keyCode === 13) {
    e.preventDefault();
    document.getElementById("sendBtn").click();
  }
});
