// pages/api/geocode.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface GeocodeResponse {
    lat: number;
    lng: number;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GeocodeResponse | { message: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ message: 'Missing or invalid address parameter.' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('GOOGLE_MAPS_API_KEY is not set in environment variables.');
        return res.status(500).json({ message: 'Server configuration error: Google Maps API key missing.' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK' && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return res.status(200).json({ lat: location.lat, lng: location.lng });
        } else {
            console.warn(`Geocoding failed for address: "${address}". Status: ${data.status}`);
            return res.status(404).json({ message: `Could not geocode address: ${data.status}` });
        }
    } catch (error: any) {
        console.error('Error in geocoding API:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('Geocoding API response error:', error.response.data);
            return res.status(error.response.status).json({ message: error.response.data.error_message || 'External geocoding service error.' });
        }
        res.status(500).json({ message: 'Internal Server Error during geocoding.' });
    }
}
