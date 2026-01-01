
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";

let client: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    // Initializing Gemini client using process.env.API_KEY directly as per guidelines.
    client = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }
  return client;
};

const SYSTEM_INSTRUCTION = `
You are Kady, the intelligent and friendly virtual receptionist for Luminous Dental Care, Dr. Faiz's clinic.
Your tone is professional, warm, empathetic, and efficient.

Your responsibilities:
1. Assist patients with general questions about dental hygiene, clinic hours (Mon-Sat 9AM-6PM), and services (Whitening, Root Canal, Orthodontics, General Checkup).
2. Help patients understand their prescriptions generally (disclaimer: always consult the doctor for specific medical advice).
3. Guide patients on how to book an appointment (tell them to use the 'Appointments' tab in the app if they ask to book).
4. Provide emergency contact info: "For emergencies, please call +1-555-0199 or visit the nearest hospital if severe."

Do NOT:
- Diagnose medical conditions.
- Prescribe medication.
- Promise specific medical outcomes.

Keep responses concise and suitable for a mobile chat interface.
`;

export const createChatSession = (): Chat => {
  const ai = getClient();
  return ai.chats.create({
    // Using gemini-3-flash-preview for general chat tasks.
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
};

export const sendMessageToKady = async (chat: Chat, message: string): Promise<string> => {
  try {
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    return result.text || "I apologize, I didn't catch that. Could you please rephrase?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the clinic server right now. Please try again later.";
  }
};

export const getDentalTip = async (): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      // Using gemini-3-flash-preview for basic text tasks.
      model: 'gemini-3-flash-preview',
      contents: "Provide a single, short, funny and factual dental health tip or fun fact about teeth. Maximum 30 words. No intro, just the text.",
    });
    return response.text.trim();
  } catch (e) {
    return "Did you know? Snails have teeth! But you should stick to brushing yours twice a day.";
  }
};

export const explainRecord = async (summary: string, language: string): Promise<{ text: string, audioData: string | undefined }> => {
  const ai = getClient();
  
  try {
    // Step 1: Generate the explanation text in the target language
    const prompt = `Act as a friendly dental assistant. Explain the following dental record summary to a patient in simple, reassuring terms in the language: "${language}". 
    
    Rules:
    - Keep it concise (under 60 words).
    - Be empathetic.
    - Do not give new medical advice, just explain the summary.
    
    Record Summary: "${summary}"`;
    
    const textResponse = await ai.models.generateContent({
      // Using gemini-3-flash-preview for clinical record explanation.
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    
    const explanationText = textResponse.text || "I could not generate an explanation at this time.";

    // Step 2: Convert the generated text to speech using gemini-2.5-flash-preview-tts.
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: explanationText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    return { text: explanationText, audioData };

  } catch (error) {
    console.error("Explanation Error:", error);
    throw new Error("Failed to generate explanation");
  }
};
