# LifeLaunch — AI handoff

Use this note with the project files when continuing work with another AI. The project folder is small, so the easiest handoff is the whole `lifelaunch` folder plus this file. Do not include generated folders or unrelated files if any are added later.

## Project overview

LifeLaunch is a browser based financial literacy learning platform. It is currently a static HTML, CSS, and JavaScript app with no framework, package manifest, account system, or backend. It uses ES modules and loads lesson JSON with `fetch`, so serve the folder over a local web server rather than opening `index.html` as a `file://` URL.

The current app has 30 lessons across five learning paths: Earning and Taxes; Budgeting and Saving; Credit and Debt; Investing and Growing Money; Banking and Staying Safe. Progress, XP, hearts, badges, and profile details are stored in `localStorage` under `lifelaunch.v1` on the current browser.

## Current state

- The app has a dashboard, learning path, lesson library and quizzes, practice activities, budgeting and investing simulations, a profile, badges, streaks, hearts, XP, and a guided tutorial.
- The dashboard has a colorful gradient welcome panel, level progress, wallet and learning stat cards, and dedicated daily goal, next lesson, and challenge panels. Its motion respects reduced-motion preferences.
- Learn, Practice, Library, Quizzes, Budget, and Profile share the same colorful card language, responsive layouts, and inline Lucide-style SVG icon set in `js/modules/icons.js` (no added runtime dependency).
- The global page canvas now uses a soft mint-to-sky gradient with warm glows, faint orbital arcs, and sparse stars; the motion is slow and disabled for reduced-motion preferences. Content cards remain light for readability.
- Mobile is the primary target: the header uses an animated hamburger that opens a springy navigation sheet with colorful destination cards and quick links; the desktop tab navigation stays in place. The menu supports Escape and keyboard focus looping, respects reduced-motion preferences, and uses safe-area padding. The sound control is icon-only with an accessible label, and cards and controls use thumb-sized targets.
- The dashboard welcome panel keeps its copy and level progress side by side at intermediate desktop widths to avoid an overly tall hero; it stacks only at the phone breakpoint.
- Mobile session result and out-of-hearts screens use a stacked layout with compact stat tiles and full-width actions. The onboarding tour points to the hamburger menu on phone widths and gives mobile-specific navigation directions.
- On phone-sized lesson sessions, a clear footer cue points to Penny’s examples and tips; it hides after the learner scrolls.
- Audio cues are mapped in `js/modules/audio.js` to `assets/audio/`; missing files fall back to synthesized tones. The dashboard plays a brief streak celebration once after a new daily check-in. Future friend-request, friend-accepted, friend-challenge, and rank-up sounds are reserved, along with invite/list animation classes; these features need the planned backend first.
- On startup, a full-screen animated loader preloads the sound bank into Cache Storage so repeat visits can reuse it, with in-memory audio sources ready for low-latency playback. `AUDIO_CACHE` in `js/modules/audio.js` should be version-bumped when replacing sound files. The loader currently uses a temporary rocket wordmark that will be replaced by the supplied logo.
- Optional menu background music is controlled separately from sound effects, starts off by default, remembers its enabled state and volume, and pauses during lesson sessions. Add the loopable soundtrack as `assets/audio/menu-music.mp3`; it loads only when enabled.
- The first run tutorial has nine steps and explains the dashboard, path, library, practice, hearts, profile, and first session.
- On a browser’s first visit, a one-time early access notice explains this is a test build, progress stays in that browser/device, account linking and cloud saves are not available, and testers should use pretend details. Acknowledge it to begin the tutorial; `testNoticeSeen` is stored with local progress.
- Each lesson has a worked example, either as a lesson card or as an `example` field in its lesson JSON. The path session displays a real life example beside the lesson.
- The path session now uses a wider learning scene with a large lesson or quiz panel, a friendly SVG mascot named Penny, the real life example, and a three step mini mission. Mobile layout stacks the side rail below the lesson.
- Penny is an original dollar-bill character drawn as one shared inline SVG in `js/modules/mascot.js`. She appears beside the next open learning-path step, in the lesson side rail, and as a small guide on the dashboard’s next-step card. Only the first unfinished path node is marked current.
- Penny acts as a lightweight guide: she points to the next lesson, gives varied lesson, example, question, calculator, and activity prompts, reacts differently to answers and streaks, and celebrates session completion. Her dialogue reveals word by word with a soft rise/fade and respects reduced-motion settings; she is not an AI mentor.
- The shared lesson card and question markup is in `js/modules/lesson-ui.js`.
- The AI mentor is a future idea; it has not been implemented. Character customization is also not implemented; the profile currently uses an initial as its avatar. There is no backend or cross device progress sync yet.

## Where to look

- `index.html` — app entry point and stylesheet/module links.
- `js/app.js` — routing, shared state, dashboard, save/load, navigation and tutorial wiring.
- `js/modules/path.js` — learning path and full screen session runner; this is the main place to change the active lesson-taking experience.
- `js/modules/lesson-ui.js` — reusable lesson and question card HTML.
- `js/modules/lessons.js` — lesson library, reading sessions and quizzes.
- `js/modules/content.js` — loads lesson JSON and converts its compact card format to UI data.
- `js/modules/tutorial.js` — onboarding tour.
- `js/modules/profile.js` — profile, display name, share card and reset controls.
- `js/modules/economy.js`, `js/modules/sim.js`, `js/modules/activities.js` — learning activities and simulations.
- `css/main.css`, `css/components.css` — visual theme and component styles. `components.css` contains the lesson scene styles near its end.
- `content/tracks.json` — authoritative order of lessons by learning path.
- `content/lessons/*.json` — lesson content. Card types are documented at the top of `tools/build.mjs`.
- `content/index.json` — generated lesson summary used by the app; do not edit it by hand.
- `tools/build.mjs` — validates lesson content and regenerates `content/index.json`. Run `node tools/build.mjs` after adding or editing lessons. It handles Windows paths with spaces.
- `js/data/gameData.js` — currency, XP tiers, badges and budgeting game data.

## Working conventions

- Keep the current lightweight, dependency free architecture unless I explicitly ask to migrate it.
- Preserve existing routes, local save format, lesson card contracts, and responsive behavior when changing a feature.
- For new lessons, use the existing JSON card types and add each lesson ID to `content/tracks.json`; regenerate `content/index.json` with `node tools/build.mjs`.
- Keep financial education clear and general. Rules vary by country, so avoid presenting jurisdiction dependent details as universal facts.
- The visual direction is playful, warm, colorful, and tactile, while keeping text readable and motion respectful of reduced motion preferences.

## Prompt to give the next AI

> You are continuing work on my LifeLaunch project. Read `AI_HANDOFF.md` first, then inspect the relevant source files before changing anything. LifeLaunch is a static, dependency free financial literacy learning app; keep its current structure and existing user progress compatible. The current project already has 30 lessons, a nine step tutorial, a colorful theme, and a redesigned lesson session with Penny, a real life example rail, and a mini mission. Do not redo completed work unless I ask. My next request is: **[describe the next feature or fix here]**. Implement that request in the project files, keep the experience responsive and accessible, and tell me what changed and where. If you add or edit lessons, update `content/tracks.json` as needed and run `node tools/build.mjs` to regenerate the lesson index.

