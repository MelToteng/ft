import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, GeminiInsightData } from '../types';

// FIX: Per coding guidelines, the Gemini client is initialized directly using an environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function getFinancialInsight(transactions: Transaction[]): Promise<GeminiInsightData> {
  // FIX: The check for `ai` initialization is removed as it's now handled at the module level.
  const simplifiedTransactions = transactions.map(({ type, amount, category, date }) => ({
    type,
    amount,
    category,
    date
  }));

  const prompt = `
    Analyze the following financial transactions. Provide a concise financial analysis.
    Transactions: ${JSON.stringify(simplifiedTransactions)}
    Your response MUST be a JSON object that strictly adheres to the provided schema.
    Do not include any introductory text, markdown formatting, or backticks around the JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A one-sentence overview of the user's financial health (e.g., 'Spending is healthy', 'Income exceeds expenses significantly')."
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 2-3 actionable tips for financial improvement (e.g., 'Consider reducing spending on \"Eating Out\"', 'Look for opportunities to increase income')."
            },
            spendingHabits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  percentage: { type: Type.NUMBER }
                }
              },
              description: "An array of objects representing the top 3-5 spending categories and their percentage of total expenses."
            }
          },
          required: ["summary", "suggestions", "spendingHabits"]
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeminiInsightData;

  } catch (error) {
    console.error("Error fetching financial insight from Gemini:", error);
    // Rethrow to be handled by the UI
    if (error instanceof Error) {
        throw new Error(`Failed to get financial insight: ${error.message}`);
    }
    throw new Error("Failed to get financial insight due to an unknown error.");
  }
}
