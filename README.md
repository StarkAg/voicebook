# VoiceBook

Voice-first staff **attendance & daily-wage** assistant for Indian shop owners. Just speak in Hindi/Hinglish/English and VoiceBook marks attendance, logs advances, and answers questions about wages and cash flow.

> Mesh API Hackathon submission (Bharat track). **Every AI call routes through the [Mesh API](https://meshapi.ai).**

## What it does

- 🎙️ **Speak to log** — "Ramesh aur Mahesh aaj present, Suresh ko 500 advance do" → done.
- 🗣️ **Ask anything** — "Ramesh ki is mahine ki kamai kitni hui?" → spoken answer.
- 📅 **Daily / Month / Stats / Pay** — full attendance grid, per-worker wage math, advances, Tuesday-bonus.

## How Mesh powers it (all AI via `api.meshapi.ai`)

| Step | Mesh capability | Model |
| --- | --- | --- |
| Voice → text | Audio transcription (STT) | `sarvam/saaras:v3` (Indian languages) |
| Understand intent | Chat completions + auto-routing | `auto` (routes to Claude Haiku/Sonnet) |
| Answer → voice | Text-to-speech (TTS) | `sarvam/bulbul:v3` |

The entire pipeline lives in [`src/lib/mesh.ts`](src/lib/mesh.ts) and [`src/lib/agent.ts`](src/lib/agent.ts).

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Mesh key (rsk_...)
npm run dev
```

## Stack

React 19 + TypeScript + Vite + Tailwind v4. Local-first storage (swappable). No AI SDK — plain OpenAI-compatible calls to Mesh.
