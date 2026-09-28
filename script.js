const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const CYCLE_MS = INHALE_MS + EXHALE_MS;

const root = document.documentElement;
const button = document.querySelector(".session-button");
const buttonLabel = document.querySelector(".button-label");
const prompt = document.querySelector(".breath-prompt");
const guide = document.querySelector(".breath-circle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let running = false;
let startedAt = 0;
let animationFrame = null;
let currentPhase = "ready";

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function renderProgress(progress, phase) {
  const eased = easeInOutSine(progress);
  const expansion = phase === "inhale" ? eased : 1 - eased;
  const minimumScale = reducedMotion.matches ? 0.84 : 0.72;
  const maximumScale = reducedMotion.matches ? 0.96 : 1;
  const scale = minimumScale + (maximumScale - minimumScale) * expansion;

  root.style.setProperty("--circle-progress", expansion.toFixed(4));
  root.style.setProperty("--circle-scale", scale.toFixed(4));
}

function setPhase(phase) {
  if (phase === currentPhase) return;

  currentPhase = phase;
  const isInhale = phase === "inhale";
  prompt.textContent = isInhale ? "Breathe in" : "Breathe out";
  guide.setAttribute(
    "aria-label",
    isInhale ? "Breathing guide, breathe in" : "Breathing guide, breathe out",
  );
}

function animate(timestamp) {
  if (!running) return;

  const cycleTime = (timestamp - startedAt) % CYCLE_MS;

  if (cycleTime < INHALE_MS) {
    setPhase("inhale");
    renderProgress(cycleTime / INHALE_MS, "inhale");
  } else {
    setPhase("exhale");
    renderProgress((cycleTime - INHALE_MS) / EXHALE_MS, "exhale");
  }

  animationFrame = requestAnimationFrame(animate);
}

function startSession() {
  running = true;
  startedAt = performance.now();
  currentPhase = "ready";
  button.setAttribute("aria-pressed", "true");
  buttonLabel.textContent = "End session";
  animate(startedAt);
}

function stopSession() {
  running = false;
  cancelAnimationFrame(animationFrame);
  animationFrame = null;
  currentPhase = "ready";
  root.style.setProperty("--circle-progress", "0");
  root.style.setProperty("--circle-scale", reducedMotion.matches ? "0.84" : "0.72");
  prompt.textContent = "Ready?";
  guide.setAttribute("aria-label", "Breathing guide, ready");
  button.setAttribute("aria-pressed", "false");
  buttonLabel.textContent = "Begin breathing";
}

button.addEventListener("click", () => {
  if (running) {
    stopSession();
  } else {
    startSession();
  }
});

reducedMotion.addEventListener("change", () => {
  if (!running) stopSession();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    return;
  }

  if (!document.hidden && running) {
    startedAt = performance.now();
    currentPhase = "ready";
    animate(startedAt);
  }
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  function requireEmptyInput(input) {
    if (
      input === null ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length > 0
    ) {
      throw new TypeError("This action does not accept any input fields.");
    }
  }

  const tools = [
    {
      name: "start_breathing_exercise",
      title: "Start breathing exercise",
      description: "Start WindDown's visible guided breathing exercise.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        requireEmptyInput(input);
        if (!running) startSession();
        return { status: "running", phase: currentPhase };
      },
    },
    {
      name: "stop_breathing_exercise",
      title: "Stop breathing exercise",
      description: "Stop WindDown's visible guided breathing exercise and reset it.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        requireEmptyInput(input);
        if (running) stopSession();
        return { status: "ready", phase: "ready" };
      },
    },
  ];

  for (const tool of tools) {
    try {
      void Promise.resolve(context.registerTool(tool)).catch(() => {});
    } catch {
      // WebMCP is optional; the visible controls remain the source of truth.
    }
  }
}

registerWebMcpTools();
