import { GoogleGenAI, Modality } from "@google/genai";
import { AgeGroup, Language } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLanguageName = (lang: Language): string => {
  switch (lang) {
    case 'zh-CN': return 'Simplified Chinese (简体中文)';
    case 'zh-TW': return 'Traditional Chinese (繁體中文)';
    default: return 'English';
  }
};

/**
 * Generate an image based on a prompt suitable for children's books.
 * The prompt should ideally be in English for best results with Nano Banana.
 */
export const generateImage = async (prompt: string, style: string = 'cartoon style, colorful, vector art'): Promise<string> => {
  try {
    // Using gemini-2.5-flash-image (Nano Banana) for general image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate an image: ${prompt}, ${style}, child friendly, cute.`,
          },
        ],
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Image generation failed, falling back to placeholder.", error);
    return `https://picsum.photos/seed/${encodeURIComponent(prompt).slice(0, 10)}/512/512`;
  }
};

/**
 * Generate text completion or suggestions.
 */
export const generateText = async (prompt: string, ageGroup: AgeGroup, language: Language = 'en'): Promise<string> => {
  try {
    const langName = getLanguageName(language);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a gentle, encouraging storyteller for a child aged ${ageGroup}. 
      Language: ${langName}.
      Keep language simple, positive, and engaging. 
      Task: ${prompt}`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Text generation error:", error);
    return "Something magical happened...";
  }
};

/**
 * Generate 3 simple suggestions for a user who is stuck.
 */
export const generateSuggestions = async (context: 'character' | 'place' | 'time', ageGroup: AgeGroup, language: Language = 'en'): Promise<string[]> => {
    try {
        const langName = getLanguageName(language);
        const prompt = `Provide 3 simple, creative options for a ${context} in a children's story. 
        Language: ${langName}.
        Format as a JSON string array. Example: ["Option A", "Option B", "Option C"].`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) return ["Option 1", "Option 2", "Option 3"];
        return JSON.parse(text) as string[];
    } catch (e) {
        return ["A funny cat", "A big bear", "A flying fish"];
    }
}

/**
 * Generate Audio (TTS) for a page.
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }, 
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Speech generation failed:", error);
    return undefined;
  }
};

/**
 * Generate a full story split into multiple pages/segments based on plot.
 */
export const generateStorySegments = async (
    inputs: { character: string; place: string; time: string; plot: string }, 
    ageGroup: AgeGroup,
    language: Language = 'en'
): Promise<Array<{ text: string; imagePrompt: string }>> => {
    const langName = getLanguageName(language);
    const prompt = `
    You are a children's book author.
    Create a short story (3 to 5 distinct pages) for a child aged ${ageGroup}.
    
    Target Language: ${langName}
    
    Story Elements:
    - Character: ${inputs.character}
    - Place: ${inputs.place}
    - Time: ${inputs.time}
    - Plot Context: ${inputs.plot}
    
    Instructions:
    - Break the story into 3-5 scenes.
    - Each scene represents one page of the book.
    - Keep text simple, engaging, and appropriate for the age group in ${langName}.
    - IMPORTANT: "imageDescription" must ALWAYS be in ENGLISH, regardless of the story language, so the image generator understands it.
    
    Output Format:
    Return strictly a JSON array of objects.
    Example: 
    [
      { "storyText": "Page 1 text in ${langName}...", "imageDescription": "Visual description in English for page 1..." },
      { "storyText": "Page 2 text in ${langName}...", "imageDescription": "Visual description in English for page 2..." }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text || "[]";
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedText);

        if (Array.isArray(data)) {
             return data.map((item: any) => ({
                text: item.storyText || "Story continues...",
                imagePrompt: item.imageDescription || `${inputs.character} in ${inputs.place}`
            }));
        }
        
        return [{ text: inputs.plot, imagePrompt: `${inputs.character} in ${inputs.place}` }];

    } catch (e) {
        console.error("Story segment generation failed:", e);
        return [{ text: inputs.plot, imagePrompt: inputs.plot }];
    }
}