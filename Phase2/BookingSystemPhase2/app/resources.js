// ===============================
// 1) DOM references
// ===============================
const actions = document.getElementById("resourceActions");
const resourceNameContainer = document.getElementById("resourceNameContainer");

// Example roles
const role = "admin"; // "reserver" | "admin"

// Will hold a reference to the Create button so we can enable/disable it
let createButton = null;
let updateButton = null;
let deleteButton = null;

// Message area reference (for server errors / success)
let messageContainer = null;

// ===============================
// 2) Button creation helpers
// ===============================

const BUTTON_BASE_CLASSES =
  "w-full rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out";

const BUTTON_ENABLED_CLASSES =
  "bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft";

const BUTTON_DISABLED_CLASSES =
  "cursor-not-allowed opacity-50";

function addButton({ label, type = "button", value, classes = "" }) {
  const btn = document.createElement("button");
  btn.type = type;
  btn.textContent = label;
  btn.name = "action";
  if (value) btn.value = value;

  btn.className = `${BUTTON_BASE_CLASSES} ${classes}`.trim();

  actions.appendChild(btn);
  return btn;
}

function setButtonEnabled(btn, enabled) {
  if (!btn) return;

  btn.disabled = !enabled;

  // Keep disabled look in ONE place (here)
  btn.classList.toggle("cursor-not-allowed", !enabled);
  btn.classList.toggle("opacity-50", !enabled);

  // Optional: remove hover feel when disabled (recommended UX)
  if (!enabled) {
    btn.classList.remove("hover:bg-brand-dark/80");
  } else {
    // Only re-add if this button is supposed to have it
    // (for Create we know it is)
    if (btn.value === "create" || btn.textContent === "Create") {
      btn.classList.add("hover:bg-brand-dark/80");
    }
  }
}

function renderActionButtons(currentRole) {
  if (currentRole === "reserver") {
    createButton = addButton({
      label: "Create",
      type: "submit",
      classes: BUTTON_ENABLED_CLASSES,
    });
  }

  if (currentRole === "admin") {
    createButton = addButton({
      label: "Create",
      type: "submit",
      value: "create",
      classes: BUTTON_ENABLED_CLASSES,
    });

    updateButton = addButton({
      label: "Update",
      value: "update",
      classes: BUTTON_ENABLED_CLASSES,
    });

    deleteButton = addButton({
      label: "Delete",
      value: "delete",
      classes: BUTTON_ENABLED_CLASSES,
    });
  }

  // Default: Buttons are disabled until validation says it's OK
  setButtonEnabled(createButton, false);
  setButtonEnabled(updateButton, false);
  setButtonEnabled(deleteButton, false);
}

// ===============================
// 3) Input creation + validation
// ===============================
function createResourceNameInput(container) {
  const input = document.createElement("input");

  // Core attributes
  input.id = "resourceName";
  input.name = "resourceName";
  input.type = "text";
  input.placeholder = "e.g., Meeting Room A";

  // Base Tailwind styling (single source of truth)
  input.className = `
    mt-2 w-full rounded-2xl border border-black/10 bg-white
    px-4 py-3 text-sm outline-none
    focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30
    transition-all duration-200 ease-out
  `;

  container.appendChild(input);
  return input;
}

function isResourceDescriptionValid(value) {
  const trimmed = value.trim();
  // Simple rule: at least 10 chars, max 50, only basic characters
  const allowedPattern = /^[a-zA-Z0-9äöåÄÖÅ .,!?()-]+$/;
  
  const lengthValid = trimmed.length >= 10 && trimmed.length <= 50;
  const charactersValid = allowedPattern.test(trimmed);

  return lengthValid && charactersValid;
}

function isResourceNameValid(value) {
  const trimmed = value.trim();
  // Name rules: 5-30 chars, letters/numbers/spaces and basic diacritics
  const allowedPattern = /^[a-zA-Z0-9äöåÄÖÅ ]+$/;

  const lengthValid = trimmed.length >= 5 && trimmed.length <= 30;
  const charactersValid = allowedPattern.test(trimmed);

  return lengthValid && charactersValid;
}


function setInputVisualState(input, state) {
  // Reset to neutral base state (remove only our own validation-related classes)
  input.classList.remove(
    "border-green-500",
    "bg-green-100",
    "focus:ring-green-500/30",
    "border-red-500",
    "bg-red-100",
    "focus:ring-red-500/30",
    "focus:border-brand-blue",
    "focus:ring-brand-blue/30"
  );

  // Ensure base focus style is present when neutral
  // (If we are valid/invalid, we override ring color but keep ring behavior)
  input.classList.add("focus:ring-2");

  if (state === "valid") {
    input.classList.add("border-green-500", "bg-green-100", "focus:ring-green-500/30");
  } else if (state === "invalid") {
    input.classList.add("border-red-500", "bg-red-100", "focus:ring-red-500/30");
  } else {
    // neutral: keep base border/bg; nothing else needed
  }
}

function attachResourceNameValidation(input) {
  const update = () => {
    const raw = input.value;
    if (raw.trim() === "") {
      setInputVisualState(input, "neutral");
      // Evaluate overall validity (might still be invalid due to other fields)
      setButtonEnabled(createButton, window.isResourceFormValid && window.isResourceFormValid());
      return;
    }

    const valid = isResourceNameValid(raw);

    setInputVisualState(input, valid ? "valid" : "invalid");
    // Only enable Create if ALL required fields are valid
    setButtonEnabled(createButton, window.isResourceFormValid && window.isResourceFormValid());
  };

  // Real-time validation
  input.addEventListener("input", update);

  // Initialize state on page load (Create disabled until valid)
  update();
}

function attachResourceDescriptionValidation(textarea) {
  const update = () => {
    const raw = textarea.value;

    if (raw.trim() === "") {
      setInputVisualState(textarea, "neutral");
      setButtonEnabled(createButton, window.isResourceFormValid && window.isResourceFormValid());
      return;
    }

    const valid = isResourceDescriptionValid(raw);
    setInputVisualState(textarea, valid ? "valid" : "invalid");
    setButtonEnabled(createButton, window.isResourceFormValid && window.isResourceFormValid());
  };

  textarea.addEventListener("input", update);
  update();
}

function ensureMessageContainer(formEl) {
  if (messageContainer) return messageContainer;
  messageContainer = document.createElement("div");
  messageContainer.id = "resourceFormMessage";
  messageContainer.className = "mb-4 hidden rounded-xl p-3 text-sm";
  formEl.insertBefore(messageContainer, formEl.firstChild);
  return messageContainer;
}

function showResourceFormMessage(type, text) {
  const el = messageContainer;
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden", "bg-green-100", "text-green-800", "bg-red-100", "text-red-800");
  if (type === "success") {
    el.classList.add("bg-green-100", "text-green-800");
  } else if (type === "error") {
    el.classList.add("bg-red-100", "text-red-800");
  }
}

// Expose overall validity check for other modules (form submit)
window.isResourceFormValid = function () {
  const nameEl = document.getElementById("resourceName");
  const descEl = document.getElementById("resourceDescription");

  const nameOk = nameEl && isResourceNameValid(nameEl.value);
  const descOk = descEl && isResourceDescriptionValid(descEl.value);

  return !!(nameOk && descOk);
};

// Expose message function so form.js can show server errors/success
window.showResourceFormMessage = function (type, text) {
  if (!messageContainer) return;
  showResourceFormMessage(type, text);
};

// ===============================
// 4) Bootstrapping
// ===============================
document.addEventListener("DOMContentLoaded", () => { 
  renderActionButtons(role); 
  
  const resourceNameInput = createResourceNameInput(resourceNameContainer); 
  attachResourceNameValidation(resourceNameInput); 
  
  const resourceDescriptionInput = document.getElementById("resourceDescription"); 
  attachResourceDescriptionValidation(resourceDescriptionInput); 
});