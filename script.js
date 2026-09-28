const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const CYCLE_MS = INHALE_MS + EXHALE_MS;
const STORAGE_KEY = "winddown-preferences";
const PREPARATION_STEPS = [
  { text: "Get comfortable.", duration: 1200 },
  { text: "3", duration: 800 },
  { text: "2", duration: 800 },
  { text: "1", duration: 800 },
];

const INTENTIONS = {
  "slow-down": {
    completion: "Carry this slower pace with you.",
  },
  "clear-mind": {
    completion: "You do not need to solve anything else right now.",
  },
  "ready-sleep": {
    completion: "Let the day end here.",
  },
};

const root = document.documentElement;
const body = document.body;
const durationInputs = [...document.querySelectorAll('input[name="duration"]')];
const intentionInputs = [...document.querySelectorAll('input[name="intention"]')];
const setupPanel = document.querySelector(".setup-panel");
const sessionStage = document.querySelector(".session-stage");
const startControls = document.querySelector(".start-controls");
const activeControls = document.querySelector(".active-controls");
const startButton = document.querySelector(".start-button");
const pauseButton = document.querySelector(".pause-button");
const pauseLabel = document.querySelector(".pause-label");
const endButton = document.querySelector(".end-button");
const breatheAgainButton = document.querySelector(".breathe-again-button");
const soundToggle = document.querySelector(".sound-toggle");
const soundLabel = document.querySelector(".sound-label");
const footerSoundState = document.querySelector(".footer-sound-state span:last-child");
const prompt = document.querySelector(".breath-prompt");
const phaseCount = document.querySelector(".phase-count");
const guide = document.querySelector(".breath-circle");
const cycleGuide = document.querySelector(".cycle-guide");
const completion = document.querySelector(".completion");
const completionMessage = document.querySelector(".completion-message");
const sessionStatus = document.querySelector(".session-status");
const soundStatus = document.querySelector(".sound-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let mode = "setup";
let animationFrame = null;
let sessionStartedAt = 0;
let pausedAt = 0;
let totalPausedMs = 0;
let selectedDurationMs = 60000;
let currentPhase = "ready";
let currentPhaseCount = null;
let preparationRun = 0;
let audioContext = null;
let soundEnabled = false;
let suppressNextCue = false;

function getSelectedValue(inputs) {
  return inputs.find((input) => input.checked)?.value;
}

function readPreferences() {
  const defaults = { duration: "1", intention: "slow-down", sound: false };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return defaults;

    return {
      duration: ["1", "3", "5"].includes(saved.duration) ? saved.duration : defaults.duration,
      intention: Object.hasOwn(INTENTIONS, saved.intention)
        ? saved.intention
        : defaults.intention,
      sound: saved.sound === true,
    };
  } catch {
    return defaults;
  }
}

function savePreferences() {
  const preferences = {
    duration: getSelectedValue(durationInputs),
    intention: getSelectedValue(intentionInputs),
    sound: soundEnabled,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // The breathing exercise remains fully usable when storage is unavailable.
  }
}

function restorePreferences() {
  const preferences = readPreferences();
  const duration = durationInputs.find((input) => input.value === preferences.duration);
  const intention = intentionInputs.find((input) => input.value === preferences.intention);

  if (duration) duration.checked = true;
  if (intention) intention.checked = true;
  setSound(preferences.sound, { save: false, announce: false });
}

function announce(message) {
  sessionStatus.textContent = "";
  requestAnimationFrame(() => {
    sessionStatus.textContent = message;
  });
}

function setSound(enabled, { save = true, announce: shouldAnnounce = true } = {}) {
  soundEnabled = enabled;
  soundToggle.setAttribute("aria-checked", String(enabled));
  soundLabel.textContent = enabled ? "Sound on" : "Sound off";
  footerSoundState.textContent = enabled ? "Sound on" : "Sound off";
  body.dataset.sound = enabled ? "on" : "off";

  if (save) savePreferences();
  if (shouldAnnounce) soundStatus.textContent = enabled ? "Gentle sound cues on." : "Sound cues off.";
}

async function prepareAudio() {
  if (!soundEnabled) return null;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("Web Audio is unavailable");
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    return audioContext;
  } catch {
    setSound(false, { save: true, announce: false });
    soundStatus.textContent = "Sound is unavailable here. The breathing guide will continue silently.";
    return null;
  }
}

async function playCue(phase) {
  const context = await prepareAudio();
  if (!context || mode !== "breathing") return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(phase === "inhale" ? 392 : 293.66, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.018, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.48);
}

function setMode(nextMode) {
  mode = nextMode;
  body.dataset.state = nextMode;
  const active = ["preparing", "breathing", "paused"].includes(nextMode);

  setupPanel.hidden = nextMode !== "setup";
  startControls.hidden = nextMode !== "setup";
  activeControls.hidden = !active;
  sessionStage.hidden = nextMode === "complete";
  completion.hidden = nextMode !== "complete";
  pauseButton.disabled = nextMode === "preparing";

  if (nextMode === "preparing") pauseLabel.textContent = "Starting…";
  if (nextMode === "breathing") pauseLabel.textContent = "Pause";
  if (nextMode === "paused") pauseLabel.textContent = "Resume";
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function renderBreath(expansion) {
  const minimumScale = reducedMotion.matches ? 0.94 : 0.72;
  const maximumScale = reducedMotion.matches ? 0.96 : 1;
  const scale = minimumScale + (maximumScale - minimumScale) * expansion;

  root.style.setProperty("--breath-light", expansion.toFixed(4));
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
  announce(isInhale ? "Breathe in for four seconds." : "Breathe out for six seconds.");

  if (suppressNextCue) {
    suppressNextCue = false;
  } else {
    void playCue(phase);
  }
}

function getSessionElapsed(timestamp) {
  return Math.max(0, timestamp - sessionStartedAt - totalPausedMs);
}

function renderSession(timestamp) {
  if (mode !== "breathing") return;

  const elapsed = getSessionElapsed(timestamp);
  if (elapsed >= selectedDurationMs) {
    finishSession(false);
    return;
  }

  const cycleTime = elapsed % CYCLE_MS;
  const firstCycle = elapsed < CYCLE_MS;
  let phase;
  let phaseProgress;
  let phaseDuration;

  if (cycleTime < INHALE_MS) {
    phase = "inhale";
    phaseProgress = cycleTime;
    phaseDuration = INHALE_MS;
  } else {
    phase = "exhale";
    phaseProgress = cycleTime - INHALE_MS;
    phaseDuration = EXHALE_MS;
  }

  setPhase(phase);
  const secondsLeft = Math.max(1, Math.ceil((phaseDuration - phaseProgress) / 1000));
  if (secondsLeft !== currentPhaseCount) {
    currentPhaseCount = secondsLeft;
    phaseCount.textContent = String(secondsLeft);
  }

  const eased = easeInOutSine(phaseProgress / phaseDuration);
  const expansion = phase === "inhale" ? eased : 1 - eased;
  renderBreath(expansion);
  root.style.setProperty("--session-progress", Math.min(1, elapsed / selectedDurationMs).toFixed(5));

  if (firstCycle) {
    cycleGuide.textContent =
      phase === "inhale"
        ? "Breathe in as the circle grows."
        : "Breathe out as it becomes smaller.";
    cycleGuide.style.opacity = "1";
  } else {
    cycleGuide.style.opacity = "0";
  }

  animationFrame = requestAnimationFrame(renderSession);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function startSession() {
  if (mode !== "setup") return;

  selectedDurationMs = Number(getSelectedValue(durationInputs)) * 60000;
  const run = ++preparationRun;
  setMode("preparing");
  root.style.setProperty("--session-progress", "0");
  cycleGuide.textContent = "";
  startButton.disabled = true;
  if (soundEnabled) void prepareAudio();

  for (const step of PREPARATION_STEPS) {
    if (run !== preparationRun || mode !== "preparing") return;
    prompt.textContent = step.text;
    phaseCount.textContent = "";
    guide.setAttribute("aria-label", step.text);
    announce(step.text === "Get comfortable." ? step.text : `Starting in ${step.text}.`);
    await wait(step.duration);
  }

  if (run !== preparationRun || mode !== "preparing") return;
  beginBreathing();
}

function beginBreathing() {
  sessionStartedAt = performance.now();
  pausedAt = 0;
  totalPausedMs = 0;
  currentPhase = "ready";
  currentPhaseCount = null;
  setMode("breathing");
  renderSession(sessionStartedAt);
}

function pauseSession() {
  if (mode !== "breathing") return;

  pausedAt = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = null;
  setMode("paused");
  prompt.textContent = "Paused";
  phaseCount.textContent = "";
  cycleGuide.textContent = "Take your time. Resume when you’re ready.";
  cycleGuide.style.opacity = "1";
  guide.setAttribute("aria-label", "Breathing guide paused");
  announce("Breathing session paused.");
}

function resumeSession() {
  if (mode !== "paused") return;

  const now = performance.now();
  totalPausedMs += now - pausedAt;
  pausedAt = 0;
  currentPhase = "paused";
  currentPhaseCount = null;
  suppressNextCue = true;
  setMode("breathing");
  announce("Breathing session resumed.");
  renderSession(now);
}

function finishSession(manual) {
  if (!["preparing", "breathing", "paused"].includes(mode)) return;

  preparationRun += 1;
  cancelAnimationFrame(animationFrame);
  animationFrame = null;
  const intention = getSelectedValue(intentionInputs) || "slow-down";
  completionMessage.textContent = INTENTIONS[intention].completion;
  root.style.setProperty("--session-progress", "1");
  root.style.setProperty("--breath-light", "0");
  setMode("complete");
  announce(
    manual
      ? `Session ended. ${INTENTIONS[intention].completion}`
      : `Session complete. ${INTENTIONS[intention].completion}`,
  );
  window.setTimeout(() => breatheAgainButton.focus(), reducedMotion.matches ? 0 : 900);
}

function resetSession() {
  preparationRun += 1;
  cancelAnimationFrame(animationFrame);
  animationFrame = null;
  currentPhase = "ready";
  currentPhaseCount = null;
  startButton.disabled = false;
  prompt.textContent = "Ready?";
  phaseCount.textContent = "4 · 6";
  cycleGuide.textContent = "";
  cycleGuide.style.opacity = "0";
  guide.setAttribute("aria-label", "Breathing guide, ready");
  root.style.setProperty("--session-progress", "0");
  renderBreath(0);
  setMode("setup");
  announce("Choose a session when you’re ready.");
  startButton.focus();
}

startButton.addEventListener("click", startSession);

pauseButton.addEventListener("click", () => {
  if (mode === "breathing") pauseSession();
  else if (mode === "paused") resumeSession();
});

endButton.addEventListener("click", () => finishSession(true));
breatheAgainButton.addEventListener("click", resetSession);

for (const input of [...durationInputs, ...intentionInputs]) {
  input.addEventListener("change", savePreferences);
}

soundToggle.addEventListener("click", async () => {
  setSound(!soundEnabled);
  if (soundEnabled) await prepareAudio();
});

reducedMotion.addEventListener("change", () => {
  if (mode === "setup") renderBreath(0);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "breathing") pauseSession();
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
      description: "Start WindDown's visible preparation and guided breathing session.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        requireEmptyInput(input);
        if (mode !== "setup") throw new Error("A session is already in progress.");
        void startSession();
        return { status: "preparing", durationMinutes: selectedDurationMs / 60000 };
      },
    },
    {
      name: "pause_or_resume_breathing_exercise",
      title: "Pause or resume breathing exercise",
      description: "Pause or resume the current WindDown session without losing progress.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        requireEmptyInput(input);
        if (mode === "breathing") pauseSession();
        else if (mode === "paused") resumeSession();
        else throw new Error("There is no active breathing session to pause or resume.");
        return { status: mode };
      },
    },
    {
      name: "stop_breathing_exercise",
      title: "End breathing exercise",
      description: "End the current WindDown session and show its calm completion screen.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        requireEmptyInput(input);
        if (!["preparing", "breathing", "paused"].includes(mode)) {
          throw new Error("There is no active breathing session to end.");
        }
        finishSession(true);
        return { status: "complete" };
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

restorePreferences();
renderBreath(0);
setMode("setup");
registerWebMcpTools();
