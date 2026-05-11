# MOB - Multipurpose Overscreen Bot - Concept Plan

## What it is

A reusable framework for transparent, always-on-top overlay windows that can observe and interact with whatever the user is running underneath. MOB ships the plumbing (window shell, screen capture, image recognition, input synthesis, IPC) so downstream applications can be thin clients focused on their own decision logic.

## Three concrete shipping applications

1. **MOB / Tacticon Game Bot** - plays Tacticon Studios games. Use cases:
    - **QA bot** - bot plays each game to surface UI regressions, broken difficulty curves, dead-end states. Pays for itself the first time it catches a bug before a Telegram send.
    - **Promo loops** - bot plays a game on a loop for the Tacticon Studios marketing site, no human attention needed.
    - **"Claude plays Tacticon" content** - Twitter / YouTube / TikTok angle, AI-plays-game format is high-engagement and free dogfooding for the brand.
    - **Tacticode showcase** - if the bot's decision loop is expressed in Tacticode-style prompts, the bot doubles as a live demo of what Tacticode can describe.
2. **Trading Bot HUD** - always-on-top, read-only thin client of the Solana trading bot. Wallet balance, open positions, last N trades, latency, kill-switch. See Trading Bot concept-plan.md Phase 3 for full spec.
3. **Signal Feed Ticker** - Bloomberg-style scrolling headline strip over the top of the user's screen. WebSocket client of Signal Feed's `/stream`. See News Aggregator concept-plan.md Phase 3 for full spec.

The framework is built first. Each application is a small adapter layer on top.

## Why this exists (the learning angle)

Overlay-window engineering covers a wide skill surface the rest of the studio's stack does not touch:

- Always-on-top + click-through window management per OS
- Screen capture (full-screen, per-window, region) at reasonable framerate
- Image recognition (template matching, perceptual hash, OCR, optionally LLM vision)
- Mouse + keyboard synthesis (with permission boundaries on macOS)
- IPC (Inter-Process Communication) between a Rust/JS shell and a Python or external worker
- Cross-platform packaging (Mac first, Windows / Linux later)

Building it against an owned target (Tacticon games) is risk-free practice. The same framework then carries trading and feed applications, which would be much harder to learn against without this controlled starting point.

## Starter target

**Game**: pick one of Bomb-inoes, Chequers, or Glyph. All three are turn-based with discrete, visually unambiguous board states and click-only input. No timing pressure, no animation chaos. Choose at scaffold time.

**Goal of v0.1**: overlay window sits over the open game (in browser), screen-captures the game canvas, detects board state, makes a legal move via simulated click, repeats until end-of-game. No AI playing strength required - random legal-move-picker is enough to validate the framework end to end.

## Build order

1. **Scaffold** - `Ventures/MOB.Multipurpose-Overscreen-Bot/` skeleton, GitHub repo `Lexxicc/MOB`, README, package.json or Cargo.toml, license, .gitignore. Decide Electron vs Tauri vs Python.
2. **Overlay shell** - transparent always-on-top window, click-through everywhere except a small control panel (start / stop / kill).
3. **Capture loop** - screen capture of the underlying game canvas (per-window if possible, full-screen with bounding-box fallback). Target 5-10 fps for turn-based, room to scale later.
4. **Vision v1** - template matching against pre-captured game-state tiles. Sufficient for turn-based games with finite tile types.
5. **Input synthesis** - simulated mouse click at game-canvas coordinates, with safety guard (kill-switch + bounding-box constraint so the bot cannot click outside the target window).
6. **Decision stub** - random-legal-move picker for the chosen game. No strategy yet - the goal is to prove the loop works.
7. **First-game integration** - wire all the above against Bomb-inoes / Chequers / Glyph. Bot plays a complete game start to finish.
8. **Second-game port** - port to a second turn-based game to validate the framework is genuinely reusable, not single-game-coded.
9. **Real-time graduation** - port to a real-time game (Sticky Balls, Block Drop). Drives capture framerate and input timing improvements.
10. **Strategy layer (optional)** - replace random-move with Tacticode-described strategy or LLM-driven decision. This is the "Claude plays Tacticon" content angle.

Each downstream application (Trading Bot HUD, Signal Feed Ticker) plugs in once the shell + IPC is stable, parallel to the game-bot track.

## Open decisions (resolve at scaffold time)

- **Stack**: Electron vs Tauri vs Python + Qt. Leaning Electron for PoC speed.
- **Vision approach**: template matching first, OCR via Tesseract for text-heavy games (Scramble), LLM vision (Claude API) only when classical CV (Computer Vision) hits a wall.
- **Decision loop language**: JS / TS in the shell or external worker in Python. Python wins if reusing existing trading-bot Python.
- **macOS permissions**: screen-recording + accessibility permissions need to be granted in System Settings. Document this in README - it is the first onboarding-time gotcha.

## What MOB will NOT do

- No anti-cheat / detection evasion. Targets are user-owned or the user's own bot. If a third-party site adds detection later, MOB does not work around it.
- No headless browser scraping - that lives elsewhere (the News Aggregator's ingest worker).
- No native UI automation (Apple Events, AppleScript). MOB is a screen-vision bot. If a target exposes a real API, use that instead and skip MOB.

## Success criteria for v1.0

- Bot plays a full game of Bomb-inoes / Chequers / Glyph from start screen to game-over with zero human input
- Bot plays a second turn-based game with `<` 10 percent of the v1.0 code being game-specific
- Overlay survives target-window resize / focus changes / multi-monitor without crashing
- Kill-switch halts the bot in `<` 200ms from click
- Cold-start to first move under 5 seconds on the maintainer's machine
