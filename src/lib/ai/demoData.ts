import type { Transaction } from "./analyze";

/**
 * Demo transaction set: a health-conscious student spender.
 * Expected to produce a high Money Score.
 */
export const demoHealthySpender: Transaction[] = [
  { description: "Bus pass", amount: 5, type: "expense" },
  { description: "Grocery run", amount: 24, type: "expense" },
  { description: "Textbooks", amount: 45, type: "expense" },
  { description: "Coffee", amount: 4, type: "expense" },
  { description: "Scholarship deposit", amount: 1200, type: "income" },
];

/**
 * Demo transaction set: a student overspending on food and transport.
 * Expected to produce a low Money Score and food/transport-heavy insights.
 */
export const demoOverspendingStudent: Transaction[] = [
  { description: "Chick-fil-A", amount: 16, type: "expense" },
  { description: "DoorDash", amount: 38, type: "expense" },
  { description: "Chipotle", amount: 22, type: "expense" },
  { description: "Starbucks", amount: 12, type: "expense" },
  { description: "Uber", amount: 25, type: "expense" },
  { description: "Concert tickets", amount: 120, type: "expense" },
];
