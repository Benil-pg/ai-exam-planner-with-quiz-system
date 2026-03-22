import { GoogleGenAI, Type } from "@google/genai";

export interface Subject {
  id: string;
  name: string;
  units: number;
}

export interface StudyDay {
  dayNumber: number;
  date: string;
  subject: string;
  units: number[];
  isRevision: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

export interface QuizResult {
  score: number;
  total: number;
  wrongAnswers: {
    question: string;
    userAnswer: number;
    correctAnswer: number;
    explanation?: string;
  }[];
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuiz(content: string, fileData?: { data: string; mimeType: string }): Promise<QuizQuestion[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Generate 10 multiple choice questions with 4 options and correct answers from the provided content.
  
  Return the result as a JSON array of objects with the following structure:
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswer": number (0-3)
  }`;

  const parts: any[] = [{ text: prompt }];
  
  if (content) {
    parts.push({ text: `Content: ${content}` });
  }
  
  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType
      }
    });
  }

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                minItems: 4,
                maxItems: 4
              },
              correctAnswer: { type: Type.INTEGER }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as QuizQuestion[];
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}
