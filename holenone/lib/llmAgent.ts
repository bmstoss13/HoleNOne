import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai';

// Ensure you have your API key for the LLM configured securely
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface LLMResult {
  toolCall: ToolCall | null;
  response: string; // Direct text response from LLM
  thought: string; // LLM's reasoning
}

export async function queryLLM(prompt: string, tools: any[]): Promise<LLMResult> {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp', // Updated to latest model name
    tools 
  });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO, // Use the enum instead of string
          allowedFunctionNames: tools.map(tool => tool.name)
        }
      }
    });

    const response = result.response;
    
    // Check for function calls
    const functionCalls = response.functionCalls();
    const textResponse = response.text();

    if (functionCalls && functionCalls.length > 0) {
      // Handle the first function call (adjust for multiple if needed)
      const functionCall = functionCalls[0];
      return {
        toolCall: {
          name: functionCall.name,
          args: functionCall.args || {},
        },
        response: textResponse || '', // LLM might still provide some text
        thought: `LLM decided to call function: ${functionCall.name}`
      };
    } else {
      return {
        toolCall: null,
        response: textResponse || "No specific action or tee times found. Please check manually.",
        thought: 'LLM provided a textual response without function calls.'
      };
    }
  } catch (error) {
    console.error('Error querying LLM:', error);
    return {
      toolCall: null,
      response: "I encountered an error while processing your request. Please try again.",
      thought: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}