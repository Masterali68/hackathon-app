export type Transaction = {
  description: string;
  amount: number;
  type: "expense" | "income";
};

export type AnalysisResult = {
  score: number;
  summary: string;
  recommendations: string[];
};

const DEFAULT_BUDGET = 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function categorize(description: string): string {
  const d = description.toLowerCase();

  if (/(uber|lyft|metro|train|bus|gas|gasol|fuel)/.test(d)) return "Transport";
  if (/(food|chick|mcd|starbucks|coffee|restaurant|diner|grocery|market|pizza|subway|lunch|dinner|eat)/.test(d))
    return "Food";
  if (/(movie|netflix|spotify|hulu|concert|game|stream|video|entertainment)/.test(d))
    return "Entertainment";
  if (/(rent|housing|apartment|utilities|electric|water|internet|phone)/.test(d)) return "Housing";
  if (/(amazon|shopping|clothes|store|mall|retail|target|walmart)/.test(d)) return "Shopping";
  if (/(paycheck|salary|deposit|income|refund|scholarship|gift)/.test(d)) return "Income";
  return "Other";
}

function findPattern(expenses: Transaction[]): {
  total: number;
  spendByCategory: Record<string, number>;
  topCategory: string;
  topShare: number;
  largestAmount: number;
  average: number;
} {
  const spendByCategory: Record<string, number> = {};
  let total = 0;
  for (const t of expenses) {
    const cat = categorize(t.description);
    spendByCategory[cat] = (spendByCategory[cat] || 0) + t.amount;
    total += t.amount;
  }

  let topCategory = "Unknown";
  let topAmount = 0;
  for (const [cat, amt] of Object.entries(spendByCategory)) {
    if (amt > topAmount) {
      topAmount = amt;
      topCategory = cat;
    }
  }

  const largestAmount = Math.max(0, ...expenses.map((t) => t.amount));
  const average = expenses.length ? total / expenses.length : 0;
  const topShare = total > 0 ? topAmount / total : 0;

  return { total, spendByCategory, topCategory, topShare, largestAmount, average };
}

function calculateScore(pattern: {
  total: number;
  topShare: number;
  largestAmount: number;
  average: number;
}): number {
  const budgetRatio = clamp(1 - pattern.total / DEFAULT_BUDGET, 0, 1);
  const budgetPoints = budgetRatio * 40;

  const concentrationPenalty = pattern.topShare > 0.45 ? (pattern.topShare - 0.45) * 2 : 0;
  const concentrationPoints = Math.max(0, 1 - concentrationPenalty) * 20;

  const spikeRatio = pattern.average > 0 ? pattern.largestAmount / pattern.average : 0;
  const spikePenalty = spikeRatio > 3 ? Math.min(1, (spikeRatio - 3) / 5) : 0;
  const spikePoints = (1 - spikePenalty) * 20;

  const txCountPoints = Math.max(0, Math.min(1, pattern.total > 0 ? 1 : 0)) * 20;

  return Math.round(clamp(budgetPoints + concentrationPoints + spikePoints + txCountPoints, 0, 100));
}

function buildRecommendations(pattern: {
  total: number;
  topCategory: string;
  topShare: number;
  largestAmount: number;
  average: number;
}): string[] {
  const { total, topCategory, topShare, largestAmount, average } = pattern;
  const recs: string[] = [];
  const topSpend = round2(total * topShare);
  const fold = round2(topSpend / 2);

  recs.push(
    `${topCategory} is your biggest spending category at $${topSpend.toFixed(2)} (${Math.round(
      topShare * 100
    )}% of your total). Try cutting it in half to $${
      fold >= 10 ? Math.ceil(fold) : fold.toFixed(2)
    } this week by cooking at home or finding a cheaper alternative.`
  );

  if (largestAmount > average * 3) {
    recs.push(
      `Your largest single purchase was $${largestAmount.toFixed(2)} — about ${(
        largestAmount / average
      ).toFixed(1)}x your average spend of $${average.toFixed(2)}. Set a spending alert above $${
        Math.round(largestAmount / 2)
      } to catch impulse buys before they hit your account.`
    );
  } else {
    recs.push(
      `Your average transaction is $${average.toFixed(2)}. Review small daily purchases — little $5-$10 charges add up fast and often outpace your intentions.`
    );
  }

  const recommendedCap = round2((total * 0.6) | 0);
  recs.push(
    `Aim to keep your total spending under $${Math.round(DEFAULT_BUDGET)} this month. Try the 50/30/20 rule or set a hard cap of $${
      recommendedCap > 0 ? recommendedCap : Math.round(DEFAULT_BUDGET * 0.6)
    } for non-essentials to build a healthy buffer.`
  );

  return recs;
}

function buildSummary(pattern: {
  topCategory: string;
  topShare: number;
  total: number;
  largestAmount: number;
}): string {
  const topPercent = Math.round(pattern.topShare * 100);
  return `You spent $${pattern.total.toFixed(2)} total, with ${pattern.topCategory} as your top category at ${topPercent}%. Your largest purchase was $${pattern.largestAmount.toFixed(2)}.`;
}

export function analyzeMoney(transactions: Transaction[]): AnalysisResult {
  const expenses = transactions.filter((t) => t.type === "expense" && t.amount > 0);
  const pattern = findPattern(expenses);
  const score = calculateScore(pattern);
  const summary = buildSummary(pattern);
  const recommendations = buildRecommendations(pattern);

  return { score, summary, recommendations };
}
