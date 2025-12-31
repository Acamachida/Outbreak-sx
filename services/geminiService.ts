

import { GoogleGenAI } from "@google/genai";
import { GameStats } from "../types";

export const getEvaluation = async (stats: GameStats, isSuccess: boolean): Promise<string> => {
  try {
    // Initializing client inside the function to ensure it uses the latest API key from the environment.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Atue como um sobrevivente veterano e ranzinza chamado "VELHO REED" que está te orientando pelo rádio durante um apocalipse zumbi.
      O jogador acabou de tentar cumprir uma série de tarefas de fuga.
      Status: ${isSuccess ? 'Conseguiu chegar ao bunker' : 'Foi pego pela horda'}
      Tarefas Completas: ${stats.completedTasks}/${stats.totalTasks}
      Tempo Restante: ${stats.timeRemaining} segundos
      Score: ${stats.score}
      
      Dê uma avaliação curta e impactante (máximo 3 frases) em Português. 
      Se ele venceu, elogie a agilidade mas diga que a noite está apenas começando. 
      Se ele perdeu, lamente amargamente por mais um "sangue fresco" desperdiçado.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        // Removed maxOutputTokens to rely on default model behavior and avoid thinking budget issues.
      }
    });

    // Accessing .text property directly as per latest SDK guidelines.
    return response.text || "O rádio está com muita interferência... mas parece que você não durou muito.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return isSuccess 
      ? "Você correu bem, novato. O bunker está trancado. Por enquanto estamos seguros." 
      : "Silêncio no rádio... Outro que vira banquete de errante.";
  }
};
