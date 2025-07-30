// pages/api/search.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import OpenAI from 'openai'; // Import GenerativeModel type
import dotenv from 'dotenv';
dotenv.config();

// Define interfaces for clarity and type safety
interface Course {
    name: string;
    distance?: number;
    rating?: number;
    priceLevel?: number; // Corrected from price_level to match your Course interface
    website?: string;
    // photo?: string; // Not typically available from nearbysearch, but keep if you fetch it elsewhere
}

interface RankedCourse extends Course {
    score: number;
}

// Interface for the expected structured JSON response from Gemini
interface GeminiResponse {
    ranked: string[];       // course names in rank order
    topPick: string;        // name of top pick
    explanation: string;    // justification for top pick
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
if (!openai) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
}

// const genAI = new GoogleGenerativeAI(API_KEY);
// Initialize the model to gemini-1.5-flash-latest
// const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// Helper function for calling Gemini with exponential backoff
async function callOpenAIWithBackoff(
  payload: any,
  maxRetries = 5,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await openai.chat.completions.create(payload);
      return response;
    } catch (error: any) {
      if ((error.status === 429 || error.status === 503) && i < maxRetries - 1) {
        const retryAfter = error.headers?.['retry-after'] ? 
          parseInt(error.headers['retry-after']) * 1000 : 
          delay * Math.pow(2, i);
        console.warn(`OpenAI API temporary error. Retrying in ${retryAfter / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded for OpenAI API call.');
}

// Update the handler's AI call section:


// Process the response
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { query, date, players, lat, lng } = req.body;
    if (!lat || !lng || !query || !date || !players) {
        return res.status(400).json({ message: 'Missing required input fields.' });
    }

    try {
        // Fetch base data from your /api/courses endpoint
        const coursesApiUrl = `${req.headers.origin}/api/courses`;
        const courseRes = await axios.post(coursesApiUrl, { query, date, players, lat, lng });
        const courses: Course[] = courseRes.data.courses;

        // If no courses are found, return early
        if (!courses || courses.length === 0) {
            return res.status(200).json({
                topPick: "No courses found",
                explanation: "No golf courses were found matching your criteria.",
                courses: []
            });
        }

        // Build prompt for ranking
const prompt = `
Rank these golf courses based on the user's needs:
- User query: "${query}"
- Date: ${date}
- Players: ${players}

Courses (name, distance in miles, rating, price level 0-4):
${courses.map(c => `- ${c.name} (${c.distance}mi, ${c.rating}★, $${'$'.repeat(c.priceLevel || 0)})`).join('\n')}

Respond with JSON containing:
1. "ranked": Top 4 course names in order
2. "topPick": Best overall choice
3. "explanation": Brief justification mentioning distance, rating, and price
`;
        // Define the expected JSON response schema
        const responseSchema = {
            type: "object",
            properties: {
                ranked: {
                    type: "array",
                    items: { type: "string" },
                    description: "Names of the top 4 ranked courses in descending order."
                },
                topPick: {
                    type: "string",
                    description: "Name of the single top recommended course."
                },
                explanation: {
                    type: "string",
                    description: "Justification for the top pick, mentioning relevant factors like distance, rating, or price."
                }
            },
            required: ["ranked", "topPick", "explanation"]
        };

        // Call Gemini 1.5 Flash with structured output configuration
const aiResponse = await callOpenAIWithBackoff({
  model: "gpt-3.5-turbo", // or "gpt-4-turbo" for better results
  messages: [
    {
      role: "user",
      content: prompt
    }
  ],
  response_format: { type: "json_object" },
  temperature: 0.3 // Lower for more deterministic results
});
        // The API returns a parsed JSON object directly when responseMimeType is application/json
const aiText = aiResponse.choices?.[0]?.message?.content;
if (!aiText) {
  throw new Error('OpenAI returned an empty response');
}

const parsed: GeminiResponse = JSON.parse(aiText); // It's already JSON stringified by the model

        // Map ranked names back to full course objects
        const rankedCourses: RankedCourse[] = parsed.ranked
            .map(name => {
                const found = courses.find(c => c.name.toLowerCase() === name.toLowerCase());
                // Assign a score (e.g., based on rank, or a placeholder)
                return found ? { ...found, score: parsed.ranked.indexOf(name) + 1 } : null;
            })
            .filter(Boolean) as RankedCourse[]; // Filter out any nulls

        res.status(200).json({
            topPick: parsed.topPick,
            explanation: parsed.explanation,
            courses: rankedCourses // Send the full course objects with their score
        });

    } catch (error: any) {
        console.error("Search API error:", error);
        res.status(500).json({ message: 'Search service failed.', details: error.message || 'Unknown error' });
    }
}