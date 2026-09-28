# WindDown

WindDown is a focused browser-based breathing exercise for people who find it difficult to relax before sleep. Choose a one-, three-, or five-minute session and a quiet intention, then follow a gentle four-second inhale and six-second exhale rhythm.

The experience includes preparation and phase countdowns, pause and resume, subtle session progress, optional soft sound cues, reduced-motion support, and an intention-aware completion message. Preferences stay on the device; WindDown does not store personal information or breathing history.

**Live Demo:** [https://cj2919.github.io/winddown/](https://cj2919.github.io/winddown/)

## Run locally

Open `index.html` directly in a browser, or start a simple local server from this folder:

```sh
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.

## Project files

- `index.html` — page structure and accessible controls
- `styles.css` — nighttime visual design and responsive layout
- `script.js` — synchronized breathing interaction

## Project process and reflection notes

My original idea was to make a simple breathing website for people who have trouble relaxing before sleep. I wanted it to feel quiet and focused, instead of feeling like a complicated wellness app, and I kept the breathing pattern at four seconds in and six seconds out. I used OpenAI Codex as a thinking and coding partner. The main prompt direction was to develop the first start-and-stop prototype into a more complete experience while keeping it calm, private, and easy to understand. The first version already had the breathing circle and the correct rhythm, so this part matched my intention. However, it did not give the user much choice or clearly show the beginning, progress, and ending of a session.

After reviewing the first version, I added one-, three-, and five-minute choices, three intentions, a preparation countdown, pause and resume controls, a progress ring, optional sound, and a completion screen. On September 28, 2026, I tested the live site with the three-minute and “Clear my mind” choices. I checked the preparation stage, inhale and exhale directions, pause, resume, early ending, the matching completion message, “Breathe again,” the sound switch, and whether the choices stayed after refreshing. This tested path worked as expected. I did not wait through a full three- or five-minute session, and I did not test every browser, mobile size, or screen reader, so those are still limits that need more testing.

## AI and personal decision record

### Decisions I asked for or chose

- The original purpose: a calm breathing tool for winding down before sleep.
- A simple nighttime mood and a four-second inhale with a six-second exhale.
- Keeping the experience focused and not collecting breathing history or personal information.
- Publishing a working demo with GitHub Pages and documenting the process in this README.

### Decisions suggested by AI

- Offering one-, three-, and five-minute sessions and different intentions.
- Adding a preparation stage, clearer session progress, pause and resume, and a separate completion screen.
- Using an optional sound switch, saving choices only in the browser, and changing the completion message based on the selected intention.
- Adding reduced-motion support and status messages for accessibility.

### Important prompt and revision themes

These are short paraphrases of the AI-assisted work, not exact quotes from the full conversation:

- How can the basic breathing loop become a complete beginning-to-end session without making the page feel busy?
- Add choices only when they support the main purpose of winding down.
- Test the real live interaction, compare it with the original intention, and record what still has not been tested.
