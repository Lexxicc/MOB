# MOB - Multipurpose Overscreen Bot

This is the working directory for MOB, a reusable overlay-window automation framework. Open this directory when working on MOB itself or any MOB-derived application (Trading Bot HUD, Signal Feed Ticker, Tacticon game-playing bot).

## What this venture is for

A single overlay-window framework reused across three concrete shipping applications:

1. **QA bot / game-player** - plays Tacticon Studios games for regression testing, promo loop video capture, and AI-plays-Tacticon content.
2. **Trading Bot live HUD** - thin always-on-top read-only view over Phantom / DexScreener with kill-switch (Trading Bot venture, Phase 3).
3. **Signal Feed ticker** - Bloomberg-style scrolling headline strip (News Aggregator / Signal Feed venture, Phase 3).

The framework comes first. Each application is a thin client of the same shell.

## Scope boundaries

- MOB is the OVERLAY + INPUT + VISION layer, not the decision-making layer.
- Decision logic lives in the application that consumes MOB (the Trading Bot, the game-playing AI, the Signal Feed ranker).
- MOB does NOT include game-specific strategy code, trading strategy code, or news ranking. Keep those out.

## Starter target

First concrete application built on MOB: a game-playing bot for a turn-based Tacticon game (Bomb-inoes, Chequers, or Glyph). Turn-based + discrete board state + click-only input = simplest possible proof-of-concept.

## Tech stack candidates (pre-decision)

- **Electron** - faster to ship, large bundle, JS/TS only. Familiar.
- **Tauri** - lighter (Rust + system webview), better IPC with Python, smaller binary. Steeper learning curve.
- **Python + tkinter / PySide / PyQt** - simplest path, no web stack, but limited transparency / click-through support on macOS.

Decision deferred to scaffold task. Lean: Tauri for production, Electron for the PoC.

## Memory

Cross-venture memory:
`~/.claude/projects/-Users-connermac-Documents-GitHub-Tacticon-Studios-Anthropic-Command/memory/`

## Related ventures

- **Trading Bot** - `~/Documents/GitHub/Tacticon Studios/Ventures/Trading Bot/` - HUD is a MOB application (see Trading Bot concept-plan.md Phase 3).
- **News Aggregator / Signal Feed** - `~/Documents/GitHub/Tacticon Studios/Ventures/News Aggregator/` - ticker is a MOB application (see News Aggregator concept-plan.md Phase 3).
- **Tacticode** - `~/Documents/GitHub/Tacticon Studios/Tacticode/` - the game-playing bot's decision loop can be expressed in TC, doubling MOB as a live TC showcase.
