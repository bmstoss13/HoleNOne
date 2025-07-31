// pages/api/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai'; // Import OpenAI library
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Define the structure for a chat message, adapted for OpenAI's structure
interface ChatMessage {
    role: 'user' | 'assistant' | 'system'; // Added 'system' role
    content: string; // OpenAI uses 'content' for message text
}

// Define the request and response interfaces for type safety
interface ChatRequest extends NextApiRequest {
    body: {
        message: string;
        // History now expects the OpenAI-compatible ChatMessage format directly
        history: ChatMessage[]; 
    };
}

interface ChatResponseData {
    response: string;
    history: ChatMessage[]; // Updated history in OpenAI-compatible format
}

// Initialize OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Use OPENAI_API_KEY
if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY }); // Initialize OpenAI client

// Helper for exponential backoff, adapted for OpenAI
async function callOpenAIWithBackoff(
    openaiInstance: OpenAI,
    messages: ChatMessage[],
    maxRetries = 5,
    delay = 1000 // initial delay in ms
): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await openaiInstance.chat.completions.create({
                model: 'gpt-3.5-turbo', // Specify the OpenAI model
                messages: messages,
                max_tokens: 500, // Limit response length
            });
            return response;
        } catch (error: any) {
            // OpenAI API errors have a 'status' property
            if (error.status && (error.status === 429 || error.status === 500 || error.status === 503) && i < maxRetries - 1) {
                const retryAfter = error.headers && error.headers['retry-after'] ? parseInt(error.headers['retry-after']) * 1000 : delay * Math.pow(2, i);
                console.warn(`OpenAI API temporary error (${error.status}). Retrying in ${retryAfter / 1000} seconds... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            } else {
                // Re-throw other errors or the last rate limit/service unavailable error
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded for OpenAI API call.');
}

export default async function handler(
    req: ChatRequest,
    res: NextApiResponse<ChatResponseData | { message: string; details?: string }>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'Message is required.' });
    }

    try {
        // Define the system message to guide the AI's persona and knowledge
        const systemMessage: ChatMessage = {
            role: 'system',
            content: `You are Birdie AI, a helpful assistant for the "Hole 'N One" golf course and tee time booking website.
            Your primary goal is to assist users with finding golf courses and booking tee times.
            You are knowledgeable about golf courses, tee times, and the features of the "Hole 'N One" website.
            Encourage users to use the search bar to find courses.
            If a user asks about booking, guide them to use the "Book Now" buttons on the course cards.
            Keep your responses concise and focused on golf and website functionality.`
        };

        // The incoming 'history' from Chatbot.tsx is already in OpenAI's ChatMessage format.
        // We need to prepend the system message to the history for each API call.
        const openaiMessages: ChatMessage[] = [systemMessage, ...history];

        // Add the current user message to the messages array
        openaiMessages.push({ role: 'user', content: message });

        // Send the messages to OpenAI
        const result = await callOpenAIWithBackoff(openai, openaiMessages);
        
        const responseText = result.choices?.[0]?.message?.content;

        if (!responseText) {
            throw new Error('OpenAI returned an empty or invalid response.');
        }

        // Update history with the new model response
        // Note: The system message is not typically stored in the client-side history,
        // so we'll only include user and assistant messages in newHistory.
        const newHistory: ChatMessage[] = [
            ...history, // Original history from client
            { role: 'user', content: message }, // Current user message
            { role: 'assistant', content: responseText } // New model response
        ];

        res.status(200).json({
            response: responseText,
            history: newHistory,
        });

    } catch (error: any) {
        console.error('Chat API error:', error);
        res.status(500).json({ message: 'Failed to get a response from the AI.', details: error.message || 'Unknown error' });
    }
}
