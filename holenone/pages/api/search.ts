// pages/api/search.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import OpenAI from 'openai'; // Import OpenAI
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

// Import Course from your shared types file
import { Course } from '@/types/golf'; 
// Import getNearbyCourses and CoursesApiResponse from your lib/golfApi.ts
import { getNearbyCourses, CoursesApiResponse } from '../../lib/golfApi'; 

// Define interfaces for clarity and type safety
interface SearchRequest extends NextApiRequest {
    body: {
        query: string;
        date: string;
        players: number;
        lat: number;
        lng: number;
        timeOfDay?: string;
        pageToken?: string; // Add pageToken for Places API pagination
        offset?: number; // Add offset for mock data pagination
    };
}

interface SearchResponseData {
    aiRecommendedCourses: Course[]; // This will be the filtered list of AI-recommended courses (top 4)
    allFetchedCourses: Course[]; // This will be ALL courses fetched from the API
    topPick: string;
    explanation: string;
    nextPageToken?: string; // Include nextPageToken in the response
    nextOffset?: number; // Include nextOffset in the response
}

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Check if API key is set
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

// Helper function for calling OpenAI with exponential backoff
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
            // Check for rate limit (429) or service unavailable (503) errors
            if ((error.status === 429 || error.status === 503) && i < maxRetries - 1) {
                const retryAfter = error.headers?.['retry-after'] ? 
                    parseInt(error.headers['retry-after']) * 1000 : 
                    delay * Math.pow(2, i);
                console.warn(`OpenAI API temporary error. Retrying in ${retryAfter / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            } else {
                throw error; // Re-throw other errors or if max retries reached
            }
        }
    }
    throw new Error('Max retries exceeded for OpenAI API call.');
}

export default async function handler(
    req: SearchRequest,
    res: NextApiResponse<SearchResponseData | { message: string; details?: string }>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { query, date, players, lat, lng, timeOfDay, pageToken, offset } = req.body;

    if (!query || !date || !players || !lat || !lng) {
        return res.status(400).json({ message: 'Missing required search parameters.' });
    }

    try {
        // Fetch base data from your getNearbyCourses function (which calls the Places API or mock)
        // Pass pageToken and offset to getNearbyCourses for pagination
        const coursesApiResponse: CoursesApiResponse = await getNearbyCourses(
            lat,
            lng,
            25, // radiusMiles
            process.env.GOOGLE_MAPS_API_KEY as string, // Ensure this is passed
            pageToken, // Pass the pageToken received from the frontend
            offset // Pass the offset received from the frontend
        );
        
        // Correctly extract the courses array and pagination tokens from the response
        const allFetchedCourses: Course[] = coursesApiResponse.courses; // This is the full list from Places API
        const newNextPageToken = coursesApiResponse.nextPageToken;
        const newNextOffset = coursesApiResponse.nextOffset;

        // If no courses are found from the API, return early
        if (allFetchedCourses.length === 0) {
            return res.status(200).json({
                aiRecommendedCourses: [],
                allFetchedCourses: [], // No courses fetched at all
                topPick: "No Recommendation",
                explanation: "No golf courses found for your criteria. Try adjusting your search!",
                nextPageToken: newNextPageToken, // Still return these even if no courses
                nextOffset: newNextOffset
            });
        }

        // Build prompt for ranking
        const prompt = `Given the following golf courses, recommend the single best one for a user who searched for "${query}" for ${players} players on ${date} ${timeOfDay ? `at ${timeOfDay}` : ''}.
        
        Courses (name, distance in miles, rating, price level 0-4):
        ${allFetchedCourses.map(c => `- ${c.name} (${c.distance}mi, ${c.rating ? c.rating + '★' : 'No rating'}, ${c.priceLevel ? '$'.repeat(c.priceLevel) : 'N/A'})`).join('\n')}

        Respond with JSON containing:
        1. "ranked": Top 4 course names in order
        2. "explanation": A brief explanation (1-2 sentences) for why the top recommended course was chosen.
        `;

        // Call OpenAI with structured output configuration
        const aiResponse = await callOpenAIWithBackoff({
            model: "gpt-3.5-turbo", // or "gpt-4-turbo" for better results
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" }, // Request JSON object
            temperature: 0.3 // Lower for more deterministic results
        });

        const aiText = aiResponse.choices?.[0]?.message?.content;

        if (!aiText) {
            throw new Error('OpenAI returned an empty or invalid response content.');
        }

        let parsedResponse: { ranked: string[]; explanation: string; topPick?: string }; 
        try {
            parsedResponse = JSON.parse(aiText);
        } catch (parseError) {
            console.error("Failed to parse OpenAI response as JSON:", aiText);
            // Fallback if AI response is not valid JSON
            return res.status(500).json({
                message: "Failed to get a valid recommendation from AI. Please try again.",
                aiRecommendedCourses: allFetchedCourses.slice(0, 4), // Fallback to first 4 if AI fails
                allFetchedCourses: allFetchedCourses, // Still return all fetched courses
                topPick: "No AI Recommendation",
                explanation: "The AI could not provide a specific recommendation at this time.",
                nextPageToken: newNextPageToken,
                nextOffset: newNextOffset
            });
        }

        const topPickName = parsedResponse.ranked?.[0] || parsedResponse.topPick || "No Specific Recommendation";
        const explanationText = parsedResponse.explanation || "The AI could not provide a detailed explanation.";

        // Filter the courses to include only the ones ranked by the AI
        const aiRecommendedCourses = parsedResponse.ranked
            .map(rankedName => allFetchedCourses.find(course => 
                course.name.toLowerCase() === rankedName.toLowerCase()
            ))
            .filter((course): course is Course => course !== undefined) // Type guard to filter out undefined
            .slice(0, 4); // Ensure only top 4 are included in AI recommendations


        res.status(200).json({
            aiRecommendedCourses: aiRecommendedCourses, // Send only the AI-recommended courses (max 4)
            allFetchedCourses: allFetchedCourses, // Send the complete list of fetched courses
            topPick: topPickName,
            explanation: explanationText,
            nextPageToken: newNextPageToken, // Return the next pagination token
            nextOffset: newNextOffset // Return the next pagination offset
        });

    } catch (error: any) {
        console.error('Error in /api/search:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}