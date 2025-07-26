// lib/golfApi.ts

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key incorrectly configured or missing.');
}

// Types
interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
}

interface TeeTime {
    time: string;
    availableSpots: number;
}

interface BookingResponse {
    bookingId: string;
    courseId: string;
    time: string;
    players: number;
    status: string;
}

const mockTeeTimes = [
    {
        courseId: 'public-1',
        times: [
            { time: '2025-08-10T08:00:00', availableSpots: 4 },
            { time: '2025-08-10T09:30:00', availableSpots: 2 },
        ],
    },
];

// --- Main Functions ---

export const getNearbyCourses = async (lat: number, lng: number): Promise<Course[]> => {
    const radius = 40000; // ~25 miles
    const type = 'golf_course';

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const results = response.data.results;

        const courses: Course[] = await Promise.all(
            results.map(async (place: any) => {
                const { city, state } = await getPlaceDetails(place.place_id);
                return {
                    id: place.place_id,
                    name: place.name,
                    location: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng,
                    },
                    type: 'public',
                    city,
                    state,
                };
            })
        );

        return courses;
    } catch (error) {
        console.error('Error fetching nearby golf courses:', error);
        return [];
    }
};

export const getPlaceDetails = async (placeId: string): Promise<{ city: string; state: string }> => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const components = response.data.result?.address_components || [];

        const findComponent = (types: string[]) =>
            components.find((c: any) => types.every(type => c.types.includes(type)));

        const cityComponent = findComponent(['locality']) || findComponent(['administrative_area_level_2']);
        const stateComponent = findComponent(['administrative_area_level_1']);

        return {
            city: cityComponent?.long_name || '',
            state: stateComponent?.short_name || '',
        };
    } catch (error) {
        console.error(`Error fetching place details for ${placeId}:`, error);
        return { city: '', state: '' };
    }
};

export const getTeeTimes = async (courseId: string, date: string): Promise<TeeTime[]> => {
    return mockTeeTimes.find((t) => t.courseId === courseId)?.times || [];
};

export const bookTeeTime = async ({
    courseId,
    time,
    players,
}: {
    courseId: string;
    time: string;
    players: number;
}): Promise<BookingResponse> => {
    return {
        bookingId: Math.random().toString(36).substring(2),
        courseId,
        time,
        players,
        status: 'confirmed',
    };
};

export const getBookingRules = async (courseId: string) => {
    return {
        maxAdvanceDays: 14,
        minPlayers: 1,
        maxPlayers: 4,
        isPublic: true,
    };
};
