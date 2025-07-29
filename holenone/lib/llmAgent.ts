import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, FunctionCallingMode, FunctionCall } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY; // Ensure you have GEMINI_API_KEY in your .env
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Use a stable model that supports function calling, e.g., 'gemini-1.0-pro'
// 'gemini-2.0-flash-exp' might have specific quirks or be an experimental model
// It's safer to use 'gemini-1.5-flash' or 'gemini-1.0-pro' for robust function calling.
// Let's use 'gemini-1.5-flash' as it's the newer, faster option.
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function queryLLM(prompt: string, toolDefinitions: any[]) { // Renamed 'tools' to 'toolDefinitions' for clarity
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // THIS IS THE CRUCIAL CHANGE IN STRUCTURE
      tools: toolDefinitions.map(tool => ({
        functionDeclarations: [
          {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        ],
      })),
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO, // Or 'ANY', 'NONE'
          // allowedFunctionNames: ['navigateTo', 'clickElement', 'fillInput', 'selectOption', 'findTeeTimesOnPage', 'completeBookingForm'] // Optional: specify allowed functions
        },
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const response = result.response;
    const toolCalls = response.functionCalls(); // This returns an array of FunctionCall objects
    const toolCall = toolCalls && toolCalls.length > 0 ? toolCalls[0] : undefined;
    const textResponse = response.text();
    const thought = response.candidates?.[0]?.content?.parts?.[0]?.text || ''; // Extract thought if available

    if (toolCall) {
      return { toolCall: { name: toolCall.name, args: toolCall.args }, response: textResponse, thought: thought };
    } else {
      return { response: textResponse, thought: thought };
    }

  } catch (error: any) {
    console.error('Error querying LLM:', error);
    // Attempt to parse the error details if available from GoogleGenerativeAIError
    const errorMessage = error.message || 'An unknown error occurred.';
    const errorDetails = error.errorDetails ? JSON.stringify(error.errorDetails) : '';

    throw new Error(`Error querying LLM: ${errorMessage} ${errorDetails}`);
  }
}