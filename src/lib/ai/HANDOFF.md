# PennyPilot — AI Handoff for Vishruth (Backend)

This document is your single reference for wiring the PennyPilot AI analysis
into the backend API route. The AI logic is complete and lives in `src/lib/ai/`.

## 1. Import statement

```ts
import { analyzeTransactions } from "@/lib/ai/analyzeTransactions";
```

Add this inside your server-side route handler (e.g. `src/app/api/analyze/route.ts`).

## 2. Transaction request format

The route should accept a JSON body containing an array of transactions:

```ts
type Transaction = {
  description: string;
  amount: number;
  type: "expense" | "income";
};

// example body
[
  { "description": "Chick-fil-A", "amount": 14, "type": "expense" },
  { "description": "Paycheck", "amount": 250, "type": "income" }
]
```

Pass this array directly to `analyzeTransactions(transactions)`.

## 3. Result response format

The function resolves to:

```ts
type AnalyzeResult = {
  score: number;                        // integer 0-100
  summary: string;
  recommendations: [string, string, string]; // exactly three strings
  source: "ai" | "rules";
};
```

Example:

```json
{
  "score": 64,
  "summary": "Your biggest spending pattern is retail and food/transport expenses.",
  "recommendations": ["Plan meals and use coupons to cut food costs.", "Use public transit to reduce Uber rides.", "Set a weekly budget for entertainment."],
  "source": "ai"
}
```

Forward this object as the JSON response body, unchanged.

## 4. Forward `source` to the frontend

**Do not strip `source`.** The frontend uses it to label results honestly:

- `source: "ai"` → show badge **“AI-powered insight”**
- `source: "rules"` → show badge **“Quick analysis”** plus the message
  **“Live AI unavailable — showing analysis from your data.”**

Always include `source` in the API response.

## 5. API key must remain server-side

- The key is read via `process.env.GROQ_API_KEY` **on the server only**.
- Add it to `.env.local` (git-ignored). Never commit it.
- **Never** use `NEXT_PUBLIC_GROQ_API_KEY`.
- The route runs server-side, so it can call this function safely; the key is
  never bundled to or readable by the browser.

## 6. Never call Groq from frontend code

- The AI request must **only** happen inside server code (an API route or
  Server Action).
- `analyzeTransactions` uses `process.env` and `fetch` and is not suitable for
  client components.
- Pass the final `AnalyzeResult` JSON to the frontend; do not expose the key or
  make Groq calls from the browser.

## Behavior notes

- If the key is missing, Groq errors, times out, returns invalid JSON/score, or
  returns unsafe advice, `analyzeTransactions` **never throws** — it falls back
  to the rule-based engine and returns `source: "rules"`.

## Demo data (optional, for the UI)

```ts
import { demoHealthySpender, demoOverspendingStudent } from "@/lib/ai/demoData";
```

Two ready-made transaction sets for demo/testing.
