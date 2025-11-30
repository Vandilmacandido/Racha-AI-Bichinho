import { GoogleGenAI, Type } from "@google/genai";
import { AIReceiptResponse } from "../types";

// Initialize Gemini Client
// Note: In a real production app, API keys should be handled via backend proxy.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = "gemini-2.5-flash";

export const analyzeReceiptText = async (text: string): Promise<AIReceiptResponse> => {
  try {
    const prompt = `
      Você é um assistente financeiro especialista em dividir contas de restaurantes e viagens.
      Analise o seguinte texto de recibo (que pode estar bagunçado ou ser apenas uma lista digitada).
      
      Extraia cada item, seu preço e categoriza-o.
      Para cada item, sugira uma estratégia de divisão (ex: 'TODOS', 'BEBEDORES_ALCOOL', 'INDIVIDUAL').
      
      Texto do Recibo:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING, description: "Categoria ex: Comida, Bebida, Serviço, Transporte" },
                  suggestedSplitStrategy: { type: Type.STRING, description: "Sugestão de divisão baseada no item" }
                },
                required: ["description", "amount", "category"]
              }
            },
            currency: { type: Type.STRING },
            total: { type: Type.NUMBER }
          },
          required: ["items", "total", "currency"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIReceiptResponse;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
};

export const generateSpendingInsights = async (expenses: any[], participants: any[]): Promise<string> => {
  try {
    const dataSummary = JSON.stringify({ expenses, participants });
    
    const prompt = `
      Analise os seguintes dados de despesas de um grupo de amigos (JSON abaixo).
      Gere um insight curto, interessante e útil (máximo 2 parágrafos) em Português.
      
      Foque em:
      1. Quem gastou mais.
      2. Qual categoria foi a mais cara (ex: gastaram muito em bebida).
      3. Uma dica financeira rápida ou observação curiosa.

      Dados:
      ${dataSummary}
    `;

    const response = await ai.models.generateContent({
      model: modelId, // Using Flash for speed on insights
      contents: prompt,
      config: {
        // Just plain text needed here
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Erro ao analisar os dados.";
  }
};
