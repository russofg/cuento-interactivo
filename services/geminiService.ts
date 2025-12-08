import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StorySegment } from '../types';

// En Vite, las variables de entorno del cliente deben empezar con VITE_ y usarse con import.meta.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing from environment variables.");
  console.error("Por favor, crea un archivo .env en la raíz del proyecto con: VITE_GEMINI_API_KEY=tu_api_key_aqui");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

// Helper to clean Markdown code blocks from JSON response
const cleanAndParseJSON = (text: string): any => {
  try {
    // Remove ```json and ``` wrapping if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.error("Raw text was:", text);
    throw new Error("Error de formato en la historia. Intenta de nuevo.");
  }
};

// Define the exact JSON structure we want back from Gemini
const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    content: {
      type: Type.STRING,
      description: "La narración de la escena. Entre 80 y 120 palabras. Usa español Rioplatense (Argentina).",
    },
    choices: {
      type: Type.ARRAY,
      description: "3 opciones para continuar la acción.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "Acción sugerente o romántica del usuario." },
          tone: { type: Type.STRING, description: "Tono (ej: Brusco, Sutil, Intenso, Romántico)." }
        },
        required: ["text", "tone"]
      }
    },
    isEnding: {
      type: Type.BOOLEAN,
      description: "True SOLO si la historia ha llegado a un final definitivo."
    }
  },
  required: ["content", "choices", "isEnding"]
};

const SYSTEM_INSTRUCTION = `
ROL: Eres un autor experto en novelas románticas y eróticas interactivas, especializado en dialecto Rioplatense (Argentina).

ESTILO:
- Lenguaje apasionado, realista y sugerente.
- Usa modismos argentinos naturales ("che", "re", pija, concha, leche, acabar, culo, tetas, etc.) para dar contexto y cercanía.
- Enfócate en sensaciones: la respiración, el tacto, la temperatura, la tensión eléctrica entre los cuerpos.
- EVITA la vulgaridad extrema gratuita si no es necesaria para la escena. Prefiere "calentar" el ambiente con descripciones sensoriales intensas.

RITMO DE LA HISTORIA (CRÍTICO):
- Construye la tensión ("Slow Burn"). Haz que los personajes se deseen mucho antes de consumar el acto.
- La anticipación es clave.

REGLAS DE SEGURIDAD:
- Contexto de ficción adulta consensual.
- NADA de violencia, no consentimiento, o temas ilegales.
- Si la escena se vuelve demasiado explícita, enfócate en las emociones y el placer mutuo.
`;

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// Helper to define anatomy based on gender to prevent AI confusion
const getAnatomyReminder = (gender: string, orientation: string) => {
  let userAnatomy = "";
  if (gender === 'Hombre') userAnatomy = "El protagonista es HOMBRE.";
  else if (gender === 'Mujer') userAnatomy = "La protagonista es MUJER.";
  else userAnatomy = "El protagonista es TRANS/NO BINARIO.";

  return `
    RECORDATORIO DE IDENTIDAD:
    - Usuario: ${gender}. ${userAnatomy}
    - Interés: ${orientation}. (El personaje de la IA debe corresponder a esta preferencia).
    - Mantén la coherencia biológica de los personajes.
  `;
};

export const startNewStory = async (
  name: string,
  gender: string,
  orientation: string,
  theme: string
): Promise<StorySegment> => {
  const anatomyPrompt = getAnatomyReminder(gender, orientation);
  
  const prompt = `
    INICIO DE HISTORIA.
    Protagonista: ${name} (${gender}).
    Interés: ${orientation}.
    Escenario: ${theme}.
    
    ${anatomyPrompt}

    Genera una introducción (80-100 palabras).
    FASE: INTRODUCCIÓN / TENSIÓN.
    OBJETIVO: Establecer el deseo y la situación. Tensión sexual alta, miradas, roces, ambiente cargado.
    
    Termina con 3 opciones que inviten a escalar la situación poco a poco.
    'isEnding' debe ser FALSE.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.85, // Slightly lower temp to avoid hallucinations into prohibited territory
        safetySettings: SAFETY_SETTINGS,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Blocked");
    return cleanAndParseJSON(text) as StorySegment;
  } catch (error) {
    console.error("Start error:", error);
    // Fallback simple start logic could go here
    throw error;
  }
};

export const continueStory = async (
  history: { role: string; text: string }[],
  userChoice: string,
  profile: { name: string; gender: string; orientation: string }
): Promise<StorySegment> => {
  
  const recentHistory = history.slice(-6); 
  const context = recentHistory.map(h => `${h.role === 'user' ? 'Lector' : 'Autor'}: ${h.text}`).join('\n');
  const turnCount = history.length;
  const anatomyPrompt = getAnatomyReminder(profile.gender, profile.orientation);

  let phaseInstruction = "";
  let forceKeepGoing = true;

  // Lógica de Fases para controlar el ritmo (Pacing)
  if (turnCount < 6) {
    phaseInstruction = `
      FASE: LA PREVIA (FOREPLAY).
      INSTRUCCIÓN: Aumenta la tensión y el coqueteo intenso.
      ACCIONES: Besos apasionados, caricias, palabras al oído.
      PROHIBIDO: Ir demasiado rápido al acto final. Mantén el deseo ardiendo.
    `;
  } else if (turnCount < 14) {
    phaseInstruction = `
      FASE: JUEGO INTENSO.
      INSTRUCCIÓN: La ropa empieza a estorbar. Contacto piel con piel.
      El lenguaje debe ser íntimo, caliente y explicito, describiendo el placer de tocar y ser tocado.
    `;
  } else if (turnCount < 25) {
    phaseInstruction = `
      FASE: CLÍMAX EMOCIONAL Y FÍSICO.
      INSTRUCCIÓN: El momento de mayor unión. Describe la pasión desbordada.
      Enfócate en cómo se sienten los cuerpos moviéndose juntos, el placer compartido.
      Usa eufemismos elegantes y explicitos si es necesario para mantener la narrativa fluida sin bloqueos.
    `;
  } else {
    phaseInstruction = `
      FASE: FINAL.
      INSTRUCCIÓN: Lleva la historia a una conclusión satisfactoria , romántica/intensa y explicita.
      Si decides terminar, marca 'isEnding': true.
    `;
    forceKeepGoing = false;
  }

  const prompt = `
    HISTORIA PREVIA:
    ${context}

    ${anatomyPrompt}

    ACCIÓN ELEGIDA:
    "${userChoice}"
    
    INSTRUCCIONES DE FASE ACTUAL (Turno ${turnCount}):
    ${phaseInstruction}
    
    REGLA JSON:
    "isEnding": ${forceKeepGoing ? 'false' : 'true o false según narrativa'} (¡IMPORTANTE!)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.85,
        safetySettings: SAFETY_SETTINGS,
      }
    });

    const text = response.text;
    if (!text) {
        return await retrySoftStory(prompt);
    }
    return cleanAndParseJSON(text) as StorySegment;
  } catch (error) {
    console.error("Continue error:", error);
    // Attempt retry logic if not already tried
    try {
        return await retrySoftStory(prompt);
    } catch (e) {
        throw new Error("Error en la conexión. Intenta elegir de nuevo.");
    }
  }
};

const retrySoftStory = async (originalPrompt: string): Promise<StorySegment> => {
    console.log("Retrying with soft prompt due to block...");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: originalPrompt + "\nNOTA: El contenido anterior fue bloqueado. REESCRIBE la escena enfocándote puramente en el ROMANCE, las emociones y sensaciones sutiles y explicitas. EVITA palabras muy explícitas. Hazlo sugestivo pero seguro.",
            config: {
                systemInstruction: "Escribe novela romántica, explicita adulta. Usa metáforas en lugar de descripciones directas si es necesario. JSON.",
                responseMimeType: "application/json",
                responseSchema: storySchema,
                safetySettings: SAFETY_SETTINGS,
            }
        });
        const text = response.text;
        if (!text) throw new Error("Blocked again");
        return cleanAndParseJSON(text) as StorySegment;
    } catch (e) {
        throw new Error("La escena es demasiado intensa para el sistema. Prueba elegir una opción más suave.");
    }
}
