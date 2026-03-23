# DryRun

**Practice before it costs you.**

DryRun is a voice AI workplace conversation simulator. Before you walk into a hard conversation — asking for a raise, resigning, delivering bad news — you practice it live against an AI playing the actual person, with their personality, their pressure tactics, and optionally their cloned voice.

---

## How it works

1. **Setup** — Choose a scenario (ask for a raise, resign, push back on a decision, etc.), configure who you're talking to, their personality, their name, and your biggest fear going in.
2. **Session** — Have a live voice conversation with the AI playing the other person in character. Real-time tactic detection shows you when pressure moves are being used and suggests counter-moves.
3. **Debrief** — Get a scored analysis of your performance: tactics the AI used, what you handled well, and specific fixes for next time.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16.2.1 (App Router, TypeScript) |
| Voice AI | Vapi (`@vapi-ai/web`) |
| AI model | GPT-4o-mini via Concentrate.ai |
| Search (Vapi tool) | Tavily |
| Voice cloning | Cartesia |
| Styling | Tailwind v4 + CSS variables |

---

## Project structure

```
app/
  page.tsx              # Setup screen — scenario config form
  session/page.tsx      # Live session — Vapi voice call + tactic sidebar
  debrief/page.tsx      # Post-session debrief — scored analysis
  api/
    debrief/route.ts    # POST /api/debrief — analyze transcript via Concentrate
    search/route.ts     # POST /api/search — Tavily proxy for Vapi tool calls
    clone-voice/route.ts # POST /api/clone-voice — Cartesia voice cloning
  layout.tsx            # Root layout — fonts, metadata
  globals.css           # Design system CSS variables + responsive classes
lib/
  types.ts              # Shared TypeScript interfaces
  constants.ts          # Scenario, role, personality dropdown data
  vapi.ts               # Vapi browser SDK singleton
```

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Vapi — get from dashboard.vapi.ai
NEXT_PUBLIC_VAPI_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id

# Tavily — get from tavily.com
TAVILY_API_KEY=your_tavily_key

# Concentrate — get from concentrate.ai
CONCENTRATE_API_KEY=your_concentrate_key
CONCENTRATE_BASE_URL=https://api.concentrate.ai/v1

# Cartesia — get from cartesia.ai (only needed for voice cloning)
CARTESIA_API_KEY=your_cartesia_key
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vapi assistant setup

In your Vapi dashboard, the assistant should have:

- A **search tool** pointing to `POST https://your-domain.com/api/search` — used for real-time context during the session
- Variable values: `scenario`, `personRole`, `personality`, `personName`, `userFear` (these are overridden at call-start anyway)

The system prompt and first message are fully overridden at call-start via `assistantOverrides`, so the dashboard prompt is just a fallback.

---

## Voice cloning

When the user selects "Clone their voice" on the setup screen and uploads a ~15 second audio clip:

1. The clip is sent to `POST /api/clone-voice`
2. The server calls Cartesia's voice cloning API
3. The returned `voiceId` is passed to Vapi via `assistantOverrides.voice`

Requires `CARTESIA_API_KEY` to be set.

---

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Add all environment variables in the Vercel project settings under **Settings → Environment Variables**.
