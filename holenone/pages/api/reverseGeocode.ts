// pages/api/reverseGeocode.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface ReverseGeocodeResponse {
    address?: string;
    message?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ReverseGeocodeResponse | { message: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { lat, lng } = req.query;

    if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
        return res.status(400).json({ message: 'Missing or invalid latitude or longitude.' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('GOOGLE_MAPS_API_KEY is not set in environment variables.');
        return res.status(500).json({ message: 'Server configuration error: Google Maps API key missing.' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK' && data.results.length > 0) {
            // Find a suitable address component, e.g., locality, administrative_area, or formatted_address
            const addressComponents = data.results[0].address_components;
            let city = '';
            let state = '';
            let country = '';

            for (const component of addressComponents) {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                }
                if (component.types.includes('country')) {
                    country = component.long_name;
                }
            }

            let formattedAddress = '';
            if (city && state) {
                formattedAddress = `${city}, ${state}`;
            } else if (city && country) {
                formattedAddress = `${city}, ${country}`;
            } else if (data.results[0].formatted_address) {
                formattedAddress = data.results[0].formatted_address;
            }

            return res.status(200).json({ address: formattedAddress || 'Unknown Location' });
        } else {
            console.warn(`Reverse geocoding failed for coordinates: ${lat},${lng}. Status: ${data.status}`);
            return res.status(404).json({ address: 'Unknown Location', message: data.status });
        }
    } catch (error: any) {
        console.error('Error in reverse geocoding API:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('Reverse Geocoding API response error:', error.response.data);
            return res.status(error.response.status).json({ message: error.response.data.error_message || 'External reverse geocoding service error.' });
        }
        res.status(500).json({ message: 'Internal Server Error during reverse geocoding.' });
    }
}
