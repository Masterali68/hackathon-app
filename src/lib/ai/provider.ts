import type { Transaction } from "./analyze";

export const GROQ_ENDPOINT =
  process.env.GROQ_API_BASE_URL ||
  "https://api.groq.com/openai/v1/chat/completions";

export type AiAnalysis = {
  score: number;
  summary: string;
  recommendations: string[];
};

const GROQ_MODEL = "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are PennyPilot, a supportive, educational spending coach for college students.
You explain spending patterns in simple, friendly language and give practical, non-judgmental suggestions a student can act on this week.
You are not a financial professional. You never give investment advice, tax advice, lending or credit advice, or legal advice, and you never recommend specific investments or promise returns.
Always return exactly three short, specific, actionable recommendations.
Return JSON only — no Markdown, no code fences, no extra text.`;

function buildUserPrompt(transactions: Transaction[]): string {
  return `Analyze these student transactions and give educational spending coaching:
${JSON.stringify(transactions)}

Return ONLY valid JSON in this exact format:
{
  "score": 72,
  "summary": "one clear sentence on the biggest spending pattern",
  "recommendations": ["three", "short", "actionable tips"]
}
The score must be an integer between 0 and 100. recommendations must contain exactly three strings.`;
}

function parseScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value);
}

function parseRecommendations(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return value;
}

const UNSAFE_TERMS =
  /invest|stock|crypto|bitcoin|loan|lending|credit card|credit score|tax|legal|lawyer|attorney|etf|401k|ira|mortgage|insurance|financial advisor|returns on/i;

export function containsUnsafeAdvice(text: string[]): boolean {
  return text.some((item) => UNSAFE_TERMS.test(item));
}

export function validateAiAnalysis(data: unknown): AiAnalysis | null {
  if (typeof data !== "object" || data === null) return null;

  const record = data as Record<string, unknown>;
  const score = parseScore(record.score);
  if (score === null) return null;

  if (typeof record.summary !== "string") return null;

  const recommendations = parseRecommendations(record.recommendations);
  if (recommendations === null) return null;

  const validated: AiAnalysis = {
    score,
    summary: record.summary,
    recommendations,
  };

  return validated;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("No JSON object found in Groq response");
}

export async function callGroq(transactions: Transaction[]): Promise<AiAnalysis> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(transactions) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Groq returned no message content");
  }

  const parsed = extractJson(content);
  const validated = validateAiAnalysis(parsed);
  if (validated === null) {
    throw new Error("Groq returned invalid analysis JSON");
  }

  if (
    containsUnsafeAdvice([validated.summary, ...validated.recommendations])
  ) {
    throw new Error("Groq returned unsafe financial advice");
  }

  return validated;
}
