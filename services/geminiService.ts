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
