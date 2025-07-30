import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios'; // You might need to install axios if you haven't: npm install axios

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('----- Geocode API route hit! -----');
    // Only allow GET requests for geocoding to keep it simple,
    // as it's typically a query operation.
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Address query parameter is required.' });
    }

    // Access the API key securely from server-side environment variables
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_API_KEY) {
        console.error('Maps_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

    try {
        const response = await axios.get(geocodingUrl);
        const data = response.data;

        if (data.status === 'OK' && data.results.length > 0) {
            // Return only the necessary location data (lat/lng) to the frontend
            const location = data.results[0].geometry.location;
            return res.status(200).json(location); // { lat: number, lng: number }
        } else if (data.status === 'ZERO_RESULTS') {
            return res.status(404).json({ error: 'No results found for the given address.' });
        } else {
            console.error('Google Geocoding API error:', data.status, data.error_message);
            return res.status(500).json({ error: data.error_message || 'Error geocoding address.' });
        }
    } catch (error: any) {
        console.error('Backend geocoding request failed:', error.message || error);
        return res.status(500).json({ error: 'Failed to geocode address on the server.' });
    }
}