
import { GoogleGenAI, Type } from "@google/genai";
import { PromptFormData } from "./types";

const SYSTEM_INSTRUCTION = `You are an expert Suno AI Music Prompt Architect. Your mission is to generate 3 high-fidelity, radically distinct music style variations and lyrics based on user input.

STRICT DIVERSITY PROTOCOL:
You must ensure that each of the 3 variations sounds like a completely different interpretation of the theme. 

VARIATION ARCHETYPES:
1. VARIATION_01 (The Authentic Blueprint): Focus on the most traditional, foundational version of the genre. Use "real" instruments (drums, bass, guitar, piano). Avoid any electronic or modern fusion here.
2. VARIATION_02 (The High-Tech Fusion): Cross-pollinate the genre with a modern digital influence (Synthwave, Glitch, Industrial, or EDM). Focus on synthesis, sampling, and heavy electronic textures.
3. VARIATION_03 (The Unconventional Atmosphere): An avant-garde or cinematic reimagining. Use unusual timing (odd time signatures), atmospheric soundscapes, rare instruments (kalimba, theremin, modular synths), and non-linear song structures.

OUTPUT CONSTRAINTS:
- STYLE PROMPT: Must be a comma-separated string under 120 characters. 
- STYLE PROMPT STRUCTURE: [Specific Sub-genre], [Mood], [Tempo/BPM], [Primary Instruments], [Percussive Elements], [Vocal Style], [Secondary Textures].
- PERCUSSIVE REQUIREMENT: Every style prompt MUST include a specific tempo (e.g., "124 BPM") and a descriptive percussive element (e.g., "driving 4/4 kick drum and sharp snare", "staccato hi-hats and industrial claps", "tribal woodblock percussion", "heavy syncopated sub-bass kicks").
- NO KEYWORD OVERLAP: If you use "Electric Guitar" in Variation 1, you CANNOT use it in Variations 2 or 3. 
- SUB-GENRE FOCUS: Assign a specific, niche sub-genre to each (e.g., instead of just "Jazz", use "Hard Bop", "Nu-Jazz", and "Dark Ambient Jazz").
- BPM VARIETY: Each variation should have a different tempo (e.g., 90 BPM, 128 BPM, 160 BPM).
- LYRICS: Use Suno tags like [Verse], [Chorus], [Bridge], [Outro]. Match the complexity of the lyrics to the chosen sub-genre.

WILDCARD MODE:
If the user input is empty or asks for a surprise, invent 3 completely unrelated, vibrant concepts (e.g., 1. Viking Folk, 2. Bubblegum Pop, 3. Industrial Techno).

Format your response strictly as JSON:
{
  "variations": [
    { "style": "string", "description": "string", "lyrics": "string" },
    { "style": "string", "description": "string", "lyrics": "string" },
    { "style": "string", "description": "string", "lyrics": "string" }
  ]
}`;

export const generateSunoPrompts = async (formData: PromptFormData, excludeStyles: string[] = []) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const description = formData.description.trim() || "WILDCARD MODE: Generate 3 completely random, unrelated, and highly creative concepts from scratch.";
  
  let userPrompt = `
    PRIMARY THEME: ${description}
    REQUESTED GENRE: ${formData.genre}
    REQUESTED MOOD: ${formData.mood}
    VOCAL PROFILE: ${formData.vocals}

    EXECUTION INSTRUCTION: 
    Generate 3 variations with ZERO instrumental overlap. 
    Variation 1: Strictly acoustic/traditional.
    Variation 2: Strictly electronic/digital fusion.
    Variation 3: Strictly atmospheric/experimental.
    
    CRITICAL: For each "style" string, you MUST include:
    1. A specific BPM (e.g., "120 BPM").
    2. Specific percussion details (e.g., "fast driving kick", "tribal woodblock patterns", "crisp trap hats").
    Ensure each variation uses a distinct sub-genre keyword.
  `;

  if (excludeStyles.length > 0) {
    userPrompt += `\n\nREGENERATION MODE: The following styles were already generated and should be AVOIDED for maximum novelty: ${excludeStyles.join(" | ")}. Please provide completely fresh and unexpected alternatives.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        seed: Math.floor(Math.random() * 1000000),
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  style: { type: Type.STRING },
                  description: { type: Type.STRING },
                  lyrics: { type: Type.STRING }
                },
                required: ["style", "description", "lyrics"]
              }
            }
          },
          required: ["variations"]
        }
      },
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
