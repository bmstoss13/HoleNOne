//backend logic for golf course API interactions

import axios from 'axios';

//testing locally
import dotenv from 'dotenv';
dotenv.config();

// Google Maps API key:
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key incorrectly configured or missing.')
}

// Mock data for golf course information. Will be updated later.
const mockCourses = [
    {
        id: 'public-1',
        name: 'Muni Hills Golf Course',
        location: { lat: 30.2672, lng: -97.7431 },
        type: 'public',
        city: 'Austin',
        state: 'TX',
    },
    {
        id: 'public-2',
        name: 'Twin Pines Golf',
        location: { lat: 30.2800, lng: -97.7300 },
        type: 'public',
        city: 'Austin',
        state: 'TX',
    },
];

// Mock data for tee times. Will be updated later.
const mockTeeTimes = [
  {
    courseId: 'public-1',
    times: [
      { time: '2025-08-10T08:00:00', availableSpots: 4 },
      { time: '2025-08-10T09:30:00', availableSpots: 2 },
    ],
  },
];

// Function to fetch nearby golf courses based on latitude and longitude.
// This will be replaced with actual API calls later.
export const getNearbyMockCourses = async (lat: number, lng: number) => {
    return mockCourses;
}

// Function to fetch nearby golf courses using Google Maps Places API.
export const getNearbyCourses = async (lat: number, lng: number) => {
    const radius = 100000; //in meters
    const type = 'golf_course';
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const results = response.data.results;

        // Map the results to a more usable format, including city and state from getPlaceDetails.
        const courses = await Promise.all(
            results.map(async (place: any) => {
                const { city, state } = await getPlaceDetails(place.place_id);
                return {
                    id: place.place_id,
                    name: place.name,
                    location: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng,
                    },
                    type: 'public', // to determine type later, but stick for public for now
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

// Function to get place details using Google Maps Place Details API.
export const getPlaceDetails = async (placeID: string) => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeID}&fields=address_components,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const details = response.data.result;

        // Extract city and state from address componentes
        const city = details.address_components.find((c: any) =>
            c.types.includes('locality')
        );
        const state = details.address_components.find((c: any) =>
            c.types.includes('administrative_area_level_1')
        );
        
        return {
            city: city?.long_name || '',
            state: state?.short_name || '',
        };

    } catch (error) {
        console.error (`Error fetching place details for place ID ${placeID}:`, error);
        return {
            city: '',
            state: '',
        };
    }
}

// function to fetch golf course tee times by id
export const getTeeTimes = async (courseId: string, date: string) => {
    return mockTeeTimes.find((t) => t.courseId === courseId)?.times || [];
}

// function to book tee time (will probably be replaced)
export const bookTeeTime = async ({
    courseId,
    time,
    players,
}: {
    courseId: string;
    time: string;
    players: number;
}) => {
  // Ideally: call GolfNow API or other LocationAPI with scraping with user token
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