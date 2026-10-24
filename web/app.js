import { createBrain, mount, sound, words } from "/src/index.js";

const mini = document.getElementById("mini");
const stage = document.getElementById("stage");
const word = document.getElementById("word");
const hook = document.getElementById("hook");
const pop = document.getElementById("pop");
const toggle = document.getElementById("sound");
const compact = new URLSearchParams(location.search).has("mini");

if (compact) document.body.classList.add("pip");

let muted = false;
const critter = mount(stage, { mood: "sleeping", pixel: 6, gaze: { x: 0, y: 0 }, onCue: (cue) => sound.cue(cue) });

const brain = createBrain(
  "sleeping",
  (mood, cause) => {
    critter.feel(mood);
    word.textContent = words[mood];
    if (cause) hook.textContent = cause;
  },
  45000,
);

const stream = new EventSource("/events");
stream.onopen = () => {
  hook.textContent = "";
};
stream.onerror = () => {
  hook.textContent = "the bridge stopped";
};
stream.onmessage = (message) => {
  try {
    brain.feed(JSON.parse(message.data));
  } catch {}
};

const wake = () => sound.wake();
window.addEventListener("pointerdown", wake);
window.addEventListener("keydown", wake);

toggle.addEventListener("click", () => {
  muted = !muted;
  sound.setMuted(muted);
  toggle.textContent = muted ? "Sound off" : "Sound on";
});

pop.addEventListener("click", async () => {
  sound.wake();
  if (!("documentPictureInPicture" in window)) {
    window.open("/?mini", "termling", "width=300,height=320");
    hook.textContent = "this window stays on top only in Chrome and Edge";
    return;
  }
  const pip = await window.documentPictureInPicture.requestWindow({ width: 280, height: 300 });
  pip.document.title = "termling, unofficial fan project";
  const link = pip.document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("/style.css", location.href).href;
  const icon = pip.document.createElement("link");
  icon.rel = "icon";
  icon.href = new URL("/icon.svg", location.href).href;
  pip.document.head.append(link, icon);
  pip.document.body.classList.add("pip");
  pip.document.body.append(mini);
  pip.addEventListener("pointerdown", wake);
  pip.addEventListener("pagehide", () => {
    document.querySelector("main").prepend(mini);
  });
});
