import type { NextApiRequest, NextApiResponse } from 'next';
import { getNearbyCourses } from '../../lib/golfApi'; // Adjust path if necessary

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { query, date, players, lat, lng, timeOfDay, radiusMiles } = req.body;

    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    // Retrieve the API key securely on the server-side
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_MAPS_API_KEY) {
        console.error('GOOGLE_MAPS_API_KEY is not set in environment variables in /api/courses.ts');
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    try {
        // Pass the API key to getNearbyCourses
        const courses = await getNearbyCourses(lat, lng, radiusMiles, GOOGLE_MAPS_API_KEY);

        // You would typically apply the 'query', 'date', 'players', 'timeOfDay'
        // filters here or within getNearbyCourses if your data source supports it.
        // For now, we're just returning the courses found by location.

        return res.status(200).json({ courses });

    } catch (error: any) {
        console.error('Error in /api/courses:', error);
        return res.status(500).json({ error: 'Failed to fetch courses.' });
    }
}