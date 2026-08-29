import { analyzeMoney, type Transaction } from "./analyze";
import { callGroq, type AiAnalysis } from "./provider";

export type AnalyzeResult = AiAnalysis & {
  recommendations: [string, string, string];
  source: "ai" | "rules";
};

/**
 * Analyze a list of student transactions and return an educational spending
 * review: a Money Score (0-100), a one-sentence summary, and exactly three
 * recommendations.
 *
 * Accepts: an array of `Transaction` objects, e.g.
 *   [{ description: "Chick-fil-A", amount: 14, type: "expense" }, ...]
 *
 * Returns: an `AnalyzeResult`:
 *   {
 *     score: number,                       // 0-100
 *     summary: string,
 *     recommendations: [string, string, string],
 *     source: "ai" | "rules"
 *   }
 *
 * `source` is "ai" when a valid live Groq response was received, and "rules"
 * when Groq was unavailable or returned invalid data and the rule-based
 * fallback was used instead. This function never throws — it always returns a
 * usable result.
 *
 * Server-side only: it reads GROQ_API_KEY from process.env and must be called
 * from a backend API route, never from frontend client code.
 *
 * Vishruth's API route should import it like so:
 *   import { analyzeTransactions } from "@/lib/ai/analyzeTransactions";
 */
export async function analyzeTransactions(
  transactions: Transaction[]
): Promise<AnalyzeResult> {
  const fallback = analyzeMoney(transactions);

  try {
    const ai = await callGroq(transactions);
    return {
      score: ai.score,
      summary: ai.summary,
      recommendations: ai.recommendations as [string, string, string],
      source: "ai",
    };
  } catch (err) {
    console.error(
      "[analyze] Groq analysis failed, falling back to rule-based logic:",
      err instanceof Error ? err.message : err
    );
    return {
      ...fallback,
      recommendations: [fallback.recommendations[0], fallback.recommendations[1], fallback.recommendations[2]],
      source: "rules",
    };
  }
}
