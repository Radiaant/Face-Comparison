
import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from '../utils/fileUtils';
import { ComparisonResult } from '../types';

const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    match: { 
      type: Type.BOOLEAN, 
      description: 'True if the faces are of the same person, false otherwise.' 
    },
    similarityPercentage: { 
      type: Type.NUMBER, 
      description: 'A similarity score between 0 and 100 representing the confidence of the match.' 
    },
    reasoning: { 
      type: Type.STRING, 
      description: 'A brief explanation for the conclusion, analyzing facial features.' 
    }
  },
  required: ['match', 'similarityPercentage', 'reasoning']
};

export const compareFaces = async (image1: File, image2: File): Promise<ComparisonResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const image1Base64 = await fileToBase64(image1);
  const image2Base64 = await fileToBase64(image2);

  const imagePart1 = {
    inlineData: {
      data: image1Base64,
      mimeType: image1.type,
    },
  };

  const imagePart2 = {
    inlineData: {
      data: image2Base64,
      mimeType: image2.type,
    },
  };

  const textPart = {
    text: `Analyze the two images provided. Determine if they show the same person. Provide a detailed analysis including a similarity score from 0 to 100 and a brief reasoning for your conclusion. Respond only with the JSON object.`,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, imagePart1, imagePart2] },
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
        // FIX: Set temperature to 0.0 for deterministic output.
        temperature: 0.0, 
      },
    });
    
    const resultText = response.text.trim();
    const resultJson = JSON.parse(resultText);
    
    return resultJson as ComparisonResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to compare faces. The API call returned an error.");
  }
};
