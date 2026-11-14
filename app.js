const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LOOP = BAR * 2;

const STORAGE_KEY = "kaydens-crew-names-v1";

const defaultNames = {
  friend: "Friend",
  pet: "Pet",
};

function loadNames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultNames };
    const parsed = JSON.parse(raw);
    return {
      friend: String(parsed.friend || defaultNames.friend).slice(0, 18),
      pet: String(parsed.pet || defaultNames.pet).slice(0, 18),
    };
  } catch {
    return { ...defaultNames };
  }
}

let names = loadNames();

/** @type {AudioContext | null} */
let audioCtx = null;
/** @type {GainNode | null} */
let master = null;

const active = new Map(); // slotIndex -> { soundId, nodes, stop }

const SOUNDS = [
  {
    id: "boom",
    label: "Boom",
    cat: "beat",
    kind: "animal",
    face: "frog",
    color: "#e36b4a",
    build: kickLoop,
  },
  {
    id: "clank",
    label: "Clank",
    cat: "beat",
    kind: "space",
    face: "planet",
    color: "#c45a3a",
    build: clankLoop,
  },
  {
    id: "thump",
    label: () => names.pet,
    cat: "beat",
    kind: "pet",
    face: "paw",
    color: "#d9784a",
    build: thumpLoop,
  },
  {
    id: "whoosh",
    label: "Whoosh",
    cat: "fx",
    kind: "space",
    face: "comet",
    color: "#8b7ec8",
    build: whooshLoop,
  },
  {
    id: "sparkle",
    label: "Sparkle",
    cat: "fx",
    kind: "space",
    face: "star",
    color: "#9a8ad4",
    build: sparkleLoop,
  },
  {
    id: "wobble",
    label: "Wobble",
    cat: "fx",
    kind: "weird",
    face: "blob",
    color: "#7a6db8",
    build: wobbleLoop,
  },
  {
    id: "orbit",
    label: "Orbit",
    cat: "melody",
    kind: "space",
    face: "saturn",
    color: "#e8b84a",
    build: orbitLoop,
  },
  {
    id: "chirp",
    label: "Chirp",
    cat: "melody",
    kind: "animal",
    face: "bird",
    color: "#d4a63a",
    build: chirpLoop,
  },
  {
    id: "bloop",
    label: "Bloop",
    cat: "melody",
    kind: "weird",
    face: "googly",
    color: "#c9a03a",
    build: bloopLoop,
  },
  {
    id: "ooo",
    label: "Ooo",
    cat: "vocal",
    kind: "weird",
    face: "spook",
    color: "#2a8a84",
    build: oooLoop,
  },
  {
    id: "hey",
    label: () => names.friend,
    cat: "vocal",
    kind: "friend",
    face: "buddy",
    color: "#1f6f6a",
    build: heyLoop,
  },
  {
    id: "yip",
    label: () => names.pet,
    cat: "vocal",
    kind: "pet",
    face: "critter",
    color: "#3a9a90",
    build: yipLoop,
  },
];

const SLOT_COUNT = 7;

function soundLabel(sound) {
  return typeof sound.label === "function" ? sound.label() : sound.label;
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createGain();
    master.gain.value = 0.7;
    master.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    return audioCtx.resume();
  }
  return Promise.resolve();
}

function nextLoopStart() {
  const t = audioCtx.currentTime;
  const loops = Math.ceil(t / LOOP);
  return loops * LOOP + 0.02;
}

function makeBuffer(fn) {
  const sr = audioCtx.sampleRate;
  const len = Math.floor(LOOP * sr);
  const buffer = audioCtx.createBuffer(1, len, sr);
  const data = buffer.getChannelData(0);
  fn(data, sr);
  return buffer;
}

function playBuffer(buffer) {
  const gain = audioCtx.createGain();
  gain.gain.value = 0.9;
  gain.connect(master);

  const startAt = nextLoopStart();
  let source = null;

  const schedule = (when) => {
    source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(when);
  };

  schedule(startAt);

  return {
    stop() {
      try {
        source?.stop();
      } catch {
        /* already stopped */
      }
      gain.disconnect();
    },
  };
}

/* —— Synthesized loops (procedural, no sample files) —— */

function writeNoise(data, i0, i1, amp) {
  for (let i = i0; i < i1 && i < data.length; i++) {
    data[i] += (Math.random() * 2 - 1) * amp;
  }
}

function env(t, a, d) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (t - a) / d;
  return 0;
}

function kickLoop(data, sr) {
  const hits = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => b * BEAT);
  for (const hit of hits) {
    const n0 = Math.floor(hit * sr);
    for (let i = 0; i < sr * 0.22; i++) {
      const t = i / sr;
      const f = 120 * Math.exp(-t * 18);
      data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.005, 0.2) * 0.9;
    }
  }
}

function clankLoop(data, sr) {
  for (let b = 0; b < 8; b++) {
    if (b % 2 === 1) {
      const n0 = Math.floor(b * BEAT * sr);
      for (let i = 0; i < sr * 0.08; i++) {
        const t = i / sr;
        data[n0 + i] +=
          Math.sin(2 * Math.PI * (880 + b * 40) * t) * env(t, 0.001, 0.07) * 0.35;
        writeNoise(data, n0 + i, n0 + i + 1, env(t, 0.001, 0.05) * 0.2);
      }
    }
  }
}

function thumpLoop(data, sr) {
  for (let b = 0; b < 8; b += 2) {
    const n0 = Math.floor((b * BEAT + BEAT * 0.5) * sr);
    for (let i = 0; i < sr * 0.18; i++) {
      const t = i / sr;
      data[n0 + i] += Math.sin(2 * Math.PI * 70 * Math.exp(-t * 10) * t) * env(t, 0.01, 0.16) * 0.75;
    }
  }
}

function whooshLoop(data, sr) {
  for (let b = 0; b < 8; b += 4) {
    const n0 = Math.floor(b * BEAT * sr);
    for (let i = 0; i < sr * BEAT * 2; i++) {
      const t = i / sr;
      const amp = Math.sin((Math.PI * t) / (BEAT * 2)) * 0.22;
      writeNoise(data, n0 + i, n0 + i + 1, amp);
      data[n0 + i] += Math.sin(2 * Math.PI * (400 + t * 600) * t) * amp * 0.4;
    }
  }
}

function sparkleLoop(data, sr) {
  const notes = [0, 0.5, 1.5, 2.5, 3.25, 4, 5.5, 6.75];
  for (const beat of notes) {
    const n0 = Math.floor(beat * BEAT * sr);
    const f = 1200 + (beat * 90) % 400;
    for (let i = 0; i < sr * 0.12; i++) {
      const t = i / sr;
      data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.002, 0.1) * 0.28;
    }
  }
}

function wobbleLoop(data, sr) {
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const f = 180 + Math.sin(t * 6) * 40 + Math.sin(t * 1.5) * 20;
    data[i] += Math.sin(2 * Math.PI * f * t) * 0.18 * (0.6 + 0.4 * Math.sin(t * 3));
  }
}

function orbitLoop(data, sr) {
  const scale = [262, 311, 349, 392, 466, 392, 349, 311];
  for (let b = 0; b < 8; b++) {
    const n0 = Math.floor(b * BEAT * sr);
    const f = scale[b];
    for (let i = 0; i < sr * BEAT * 0.9; i++) {
      const t = i / sr;
      data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.01, BEAT * 0.85) * 0.22;
      data[n0 + i] += Math.sin(2 * Math.PI * f * 2 * t) * env(t, 0.01, BEAT * 0.7) * 0.08;
    }
  }
}

function chirpLoop(data, sr) {
  const times = [0.25, 1.25, 2.25, 4.25, 5.25, 6.5];
  for (const beat of times) {
    const n0 = Math.floor(beat * BEAT * sr);
    for (let i = 0; i < sr * 0.09; i++) {
      const t = i / sr;
      const f = 700 + t * 1800;
      data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.005, 0.08) * 0.3;
    }
  }
}

function bloopLoop(data, sr) {
  for (let b = 0; b < 8; b += 1) {
    if (b === 1 || b === 3 || b === 6) {
      const n0 = Math.floor(b * BEAT * sr);
      for (let i = 0; i < sr * 0.2; i++) {
        const t = i / sr;
        const f = 220 * Math.exp(-t * 3);
        data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.01, 0.18) * 0.35;
      }
    }
  }
}

function oooLoop(data, sr) {
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const gate = Math.sin((Math.PI * 2 * t) / BAR) > 0 ? 1 : 0.15;
    data[i] += Math.sin(2 * Math.PI * 196 * t) * 0.14 * gate;
    data[i] += Math.sin(2 * Math.PI * 247 * t) * 0.08 * gate;
  }
}

function heyLoop(data, sr) {
  const hits = [0, 2, 4, 6];
  for (const beat of hits) {
    const n0 = Math.floor(beat * BEAT * sr);
    for (let i = 0; i < sr * 0.28; i++) {
      const t = i / sr;
      const f = 320 + Math.sin(t * 40) * 30;
      data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.02, 0.24) * 0.32;
      writeNoise(data, n0 + i, n0 + i + 1, env(t, 0.01, 0.1) * 0.05);
    }
  }
}

function yipLoop(data, sr) {
  const hits = [1, 3, 5.5, 7];
  for (const beat of hits) {
    const n0 = Math.floor(beat * BEAT * sr);
    for (let i = 0; i < sr * 0.1; i++) {
      const t = i / sr;
      const f = 500 + t * 900;
      data[n0 + i] += Math.sin(2 * Math.PI * f * t) * env(t, 0.004, 0.09) * 0.28;
    }
  }
}

/* —— Full-body characters (Incredibox-style silhouettes, original designs) —— */

function faceSvg(face) {
  const common = `class="char-svg" viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg"`;
  const legs = (c = "#1c2430") =>
    `<rect x="28" y="78" width="10" height="22" rx="4" fill="${c}"/><rect x="42" y="78" width="10" height="22" rx="4" fill="${c}"/>`;
  const eyes = (lx = 30, rx = 50, y = 28, s = 5) =>
    `<circle cx="${lx}" cy="${y}" r="${s}" fill="#fff"/><circle cx="${rx}" cy="${y}" r="${s}" fill="#fff"/><circle cx="${lx}" cy="${y}" r="${s * 0.45}" fill="#1c2430"/><circle cx="${rx}" cy="${y}" r="${s * 0.45}" fill="#1c2430"/>`;

  switch (face) {
    case "frog":
      return `<svg ${common}><ellipse cx="40" cy="58" rx="22" ry="26" fill="#5fbf6a"/><circle cx="24" cy="26" r="12" fill="#5fbf6a"/><circle cx="56" cy="26" r="12" fill="#5fbf6a"/><circle cx="24" cy="24" r="7" fill="#fff"/><circle cx="56" cy="24" r="7" fill="#fff"/><circle cx="24" cy="24" r="3" fill="#1c2430"/><circle cx="56" cy="24" r="3" fill="#1c2430"/><ellipse cx="40" cy="42" rx="8" ry="5" fill="#3d9a4a"/><path d="M30 50c6 8 14 8 20 0" stroke="#1c2430" stroke-width="2.5" fill="none" stroke-linecap="round"/>${legs("#3d9a4a")}</svg>`;
    case "planet":
      return `<svg ${common}><ellipse cx="40" cy="48" rx="28" ry="8" fill="none" stroke="#ffc857" stroke-width="4"/><circle cx="40" cy="48" r="22" fill="#2cb5a8"/><circle cx="32" cy="40" r="5" fill="#fff8ec" opacity=".75"/>${eyes(32, 48, 46, 4)}<path d="M32 58c4 4 12 4 16 0" stroke="#1c2430" stroke-width="2" fill="none"/>${legs("#1f8f85")}</svg>`;
    case "paw":
      return `<svg ${common}><ellipse cx="40" cy="60" rx="20" ry="24" fill="#c48a5a"/><circle cx="40" cy="30" r="16" fill="#c48a5a"/><circle cx="22" cy="18" r="7" fill="#c48a5a"/><circle cx="58" cy="18" r="7" fill="#c48a5a"/>${eyes(33, 47, 28, 4)}<ellipse cx="40" cy="38" rx="5" ry="3.5" fill="#e36b4a"/>${legs("#9a6a42")}</svg>`;
    case "comet":
      return `<svg ${common}><path d="M8 20c18 4 28 18 36 40" stroke="#fff8ec" stroke-width="8" stroke-linecap="round" opacity=".55"/><circle cx="48" cy="52" r="20" fill="#7b6cff"/>${eyes(42, 56, 48, 4.5)}<circle cx="42" cy="46" r="1.5" fill="#fff"/><path d="M42 60c4 4 10 4 14 0" stroke="#1c2430" stroke-width="2" fill="none"/>${legs("#5a4fd0")}</svg>`;
    case "star":
      return `<svg ${common}><polygon points="40,8 46,28 68,28 50,42 56,64 40,50 24,64 30,42 12,28 34,28" fill="#ffc857"/><circle cx="40" cy="38" r="10" fill="#ffe9a8"/>${eyes(35, 45, 37, 3)}<path d="M35 44c2 2 6 2 8 0" stroke="#1c2430" stroke-width="1.8" fill="none"/>${legs("#e0a830")}</svg>`;
    case "blob":
      return `<svg ${common}><path d="M22 70c-8-18 0-42 18-46 20-4 30 14 28 34-2 18-14 28-28 26-10-1-14-4-18-14z" fill="#9b8fd4"/><circle cx="34" cy="40" r="7" fill="#fff"/><circle cx="52" cy="36" r="9" fill="#fff"/><circle cx="35" cy="41" r="3" fill="#1c2430"/><circle cx="54" cy="38" r="4" fill="#1c2430"/><path d="M36 56c4 5 12 5 16 0" stroke="#1c2430" stroke-width="2.2" fill="none"/>${legs("#6f63b0")}</svg>`;
    case "saturn":
      return `<svg ${common}><ellipse cx="40" cy="50" rx="30" ry="7" fill="none" stroke="#1c2430" stroke-width="3"/><circle cx="40" cy="48" r="20" fill="#ffc857"/>${eyes(33, 47, 44, 4)}<circle cx="33" cy="42" r="1.3" fill="#fff"/><path d="M33 56c4 3 10 3 14 0" stroke="#1c2430" stroke-width="2" fill="none"/>${legs("#d4a63a")}</svg>`;
    case "bird":
      return `<svg ${common}><ellipse cx="40" cy="58" rx="18" ry="22" fill="#5ec4c0"/><circle cx="40" cy="30" r="16" fill="#5ec4c0"/><path d="M54 30l14 4-14 6z" fill="#ff6b4a"/>${eyes(34, 46, 28, 4)}<path d="M18 58c-10 2-14 12-8 16 8-2 12-8 8-16z" fill="#3da8a4"/>${legs("#2f8f8b")}</svg>`;
    case "googly":
      return `<svg ${common}><rect x="22" y="34" width="36" height="46" rx="16" fill="#f0d78c"/><circle cx="40" cy="28" r="16" fill="#f0d78c"/><circle cx="30" cy="26" r="9" fill="#fff"/><circle cx="52" cy="24" r="11" fill="#fff"/><circle cx="31" cy="28" r="3.5" fill="#1c2430"/><circle cx="54" cy="26" r="4.5" fill="#1c2430"/><path d="M32 40h16" stroke="#1c2430" stroke-width="2.5" stroke-linecap="round"/>${legs("#d4b86a")}</svg>`;
    case "spook":
      return `<svg ${common}><path d="M20 40c0-14 10-22 20-22s20 8 20 22v42l-6-6-7 6-7-6-7 6-7-6-6 6z" fill="#e8ecf5"/><circle cx="32" cy="38" r="5" fill="#1c2430"/><circle cx="48" cy="38" r="5" fill="#1c2430"/><path d="M34 52c3 4 9 4 12 0" stroke="#1c2430" stroke-width="2.2" fill="none"/><ellipse cx="40" cy="20" rx="10" ry="4" fill="#9b8fd4" opacity=".5"/></svg>`;
    case "buddy":
      return `<svg ${common}><rect x="24" y="48" width="32" height="34" rx="10" fill="#2cb5a8"/><circle cx="40" cy="30" r="18" fill="#f3c7a4"/>${eyes(33, 47, 28, 4)}<path d="M32 38c4 5 12 5 16 0" stroke="#1c2430" stroke-width="2.2" fill="none"/>${legs("#1f8f85")}</svg>`;
    case "critter":
      return `<svg ${common}><ellipse cx="40" cy="60" rx="20" ry="22" fill="#c48a5a"/><circle cx="40" cy="32" r="18" fill="#c48a5a"/><circle cx="24" cy="16" r="8" fill="#c48a5a"/><circle cx="56" cy="16" r="8" fill="#c48a5a"/>${eyes(33, 47, 30, 4)}<ellipse cx="40" cy="40" rx="5" ry="3.5" fill="#ff6b4a"/>${legs("#9a6a42")}</svg>`;
    default:
      return emptyFigure();
  }
}

function emptyFigure() {
  return `<svg class="char-svg" viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg"><ellipse cx="40" cy="62" rx="18" ry="24" fill="#b8c0c8"/><circle cx="40" cy="30" r="16" fill="#c5ccd3"/><circle cx="33" cy="28" r="2.2" fill="#8a939c"/><circle cx="47" cy="28" r="2.2" fill="#8a939c"/><path d="M34 38c3 3 9 3 12 0" stroke="#8a939c" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="30" y="84" width="8" height="18" rx="3" fill="#9aa3ac"/><rect x="42" y="84" width="8" height="18" rx="3" fill="#9aa3ac"/></svg>`;
}

/* —— UI —— */

const hero = document.getElementById("hero");
const app = document.getElementById("app");
const slotsEl = document.getElementById("slots");
const trayEl = document.getElementById("tray");
const hintEl = document.getElementById("hint");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const renameBtn = document.getElementById("rename-btn");
const dialog = document.getElementById("names-dialog");
const namesForm = document.getElementById("names-form");
const friendInput = document.getElementById("friend-name");
const petInput = document.getElementById("pet-name");

const slots = Array.from({ length: SLOT_COUNT }, (_, i) => ({
  index: i,
  soundId: null,
}));

function renderSlots() {
  slotsEl.innerHTML = "";
  for (const slot of slots) {
    const sound = SOUNDS.find((s) => s.id === slot.soundId);
    const el = document.createElement("div");
    el.className = `slot ${sound ? "filled" : "empty"}`;
    el.dataset.slot = String(slot.index);
    el.innerHTML = `
      <button type="button" class="slot-remove" aria-label="Remove character" data-remove="${slot.index}">×</button>
      <div class="slot-figure">${sound ? faceSvg(sound.face) : emptyFigure()}</div>
      <p class="slot-name">${sound ? soundLabel(sound) : ""}</p>
    `;
    slotsEl.appendChild(el);
  }
}

function renderTray() {
  trayEl.innerHTML = "";
  for (const sound of SOUNDS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon";
    btn.dataset.id = sound.id;
    btn.dataset.cat = sound.cat;
    btn.setAttribute("aria-label", `Sound ${soundLabel(sound)}`);
    btn.innerHTML = `
      <span class="icon-face">${faceSvg(sound.face)}</span>
      <span class="icon-label">${soundLabel(sound)}</span>
    `;
    enableDrag(btn, sound.id);
    trayEl.appendChild(btn);
  }
}

function clearSlot(index) {
  const current = active.get(index);
  if (current) {
    current.stop();
    active.delete(index);
  }
  slots[index].soundId = null;
}

function placeSound(slotIndex, soundId) {
  const sound = SOUNDS.find((s) => s.id === soundId);
  if (!sound) return;

  clearSlot(slotIndex);
  const buffer = makeBuffer(sound.build);
  const node = playBuffer(buffer);
  active.set(slotIndex, { soundId, stop: () => node.stop() });
  slots[slotIndex].soundId = soundId;
  renderSlots();
  hintEl.textContent = "Nice! Stack more characters — or tap × to clear one.";
  wireSlotRemoves();
}

function wireSlotRemoves() {
  slotsEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = Number(btn.getAttribute("data-remove"));
      clearSlot(index);
      renderSlots();
      wireSlotRemoves();
      if (![...active.keys()].length) {
        hintEl.textContent = "Drag a character onto an empty body";
      }
    });
  });
}

function clearStage() {
  for (let i = 0; i < SLOT_COUNT; i++) clearSlot(i);
  renderSlots();
  wireSlotRemoves();
  hintEl.textContent = "Drag a character onto an empty body";
}

function renderHeroCrew() {
  const crew = document.getElementById("hero-crew");
  if (!crew) return;
  const preview = ["frog", "planet", "blob", "spook", "buddy"];
  crew.innerHTML = preview
    .map((face) => `<div class="char">${faceSvg(face)}</div>`)
    .join("");
}

/* Drag + drop (mouse + touch) */
let dragId = null;
let ghost = null;

function enableDrag(el, soundId) {
  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    dragId = soundId;
    el.classList.add("dragging");
    el.setPointerCapture?.(e.pointerId);

    ghost = document.createElement("div");
    ghost.className = "ghost-drag";
    const sound = SOUNDS.find((s) => s.id === soundId);
    ghost.style.background = getComputedStyle(el.querySelector(".icon-face")).background;
    ghost.innerHTML = faceSvg(sound.face);
    document.body.appendChild(ghost);
    moveGhost(e.clientX, e.clientY);

    const onMove = (ev) => {
      moveGhost(ev.clientX, ev.clientY);
      highlightSlot(ev.clientX, ev.clientY);
    };
    const onUp = async (ev) => {
      el.releasePointerCapture?.(ev.pointerId);
      el.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      ghost?.remove();
      ghost = null;
      const slotEl = slotFromPoint(ev.clientX, ev.clientY);
      clearHighlights();
      if (slotEl && dragId) {
        await ensureAudio();
        placeSound(Number(slotEl.dataset.slot), dragId);
      }
      dragId = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  el.addEventListener("pointerdown", onPointerDown);
}

function moveGhost(x, y) {
  if (!ghost) return;
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function slotFromPoint(x, y) {
  const stack = document.elementsFromPoint(x, y);
  return stack.find((n) => n.classList?.contains("slot"));
}

function highlightSlot(x, y) {
  clearHighlights();
  const slotEl = slotFromPoint(x, y);
  slotEl?.classList.add("drag-over");
}

function clearHighlights() {
  slotsEl.querySelectorAll(".drag-over").forEach((n) => n.classList.remove("drag-over"));
}

/* Boot */
function enterApp() {
  hero.classList.add("hidden");
  hero.hidden = true;
  app.classList.remove("hidden");
  app.hidden = false;
  ensureAudio();
}

startBtn.addEventListener("click", async () => {
  await ensureAudio();
  enterApp();
});

resetBtn.addEventListener("click", () => clearStage());

renameBtn.addEventListener("click", () => {
  friendInput.value = names.friend;
  petInput.value = names.pet;
  dialog.showModal();
});

namesForm.addEventListener("submit", (e) => {
  const submitter = e.submitter;
  if (submitter?.value === "cancel") return;
  names = {
    friend: (friendInput.value.trim() || defaultNames.friend).slice(0, 18),
    pet: (petInput.value.trim() || defaultNames.pet).slice(0, 18),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  renderTray();
  renderSlots();
  wireSlotRemoves();
});

renderHeroCrew();
renderTray();
renderSlots();
wireSlotRemoves();
