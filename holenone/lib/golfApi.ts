// lib/golfApi.ts

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key incorrectly configured or missing.');
}

const USE_MOCK_DATA = true;

// Types
interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
    website?: string;
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

const mockCourses: Course[] = [
    {
        id: 'mock-course-1',
        name: 'Pebble Beach Golf Links',
        location: { lat: 36.5681, lng: -121.9486 },
        type: 'public',
        city: 'Pebble Beach',
        state: 'CA',
    },
    {
        id: 'mock-course-2',
        name: 'Augusta National Golf Club',
        location: { lat: 33.5030, lng: -82.0199 },
        type: 'private',
        city: 'Augusta',
        state: 'GA',
    },
    {
        id: 'mock-course-3',
        name: 'St. Andrews Links',
        location: { lat: 56.3490, lng: -2.8007 },
        type: 'public',
        city: 'St Andrews',
        state: 'SCT',
    },
    {
        id: 'mock-course-4',
        name: 'Torrey Pines Golf Course',
        location: { lat: 32.8946, lng: -117.2516 },
        type: 'public',
        city: 'La Jolla',
        state: 'CA',
    },
    {
        id: 'mock-course-5',
        name: 'Whistling Straits',
        location: { lat: 43.6374, lng: -87.7367 },
        type: 'private',
        city: 'Sheboygan',
        state: 'WI',
    },
    {
        id: 'mock-course-6',
        name: 'Topgolf Austin',
        location: { lat: 30.1975, lng: -81.3937 },
        type: 'public',
        city: 'Austin',
        state: 'Tx',
        website: 'https://www.fairfaxcounty.gov/parks/golf/burke-lake'
    },
    {
        id: 'mock-course-7',
        name: 'Bethpage Black',
        location: { lat: 40.7452, lng: -73.4618 },
        type: 'public',
        city: 'Farmingdale',
        state: 'NY',
    },
    {
        id: 'mock-course-8',
        name: 'Pinehurst No. 2',
        location: { lat: 35.1954, lng: -79.4662 },
        type: 'public',
        city: 'Pinehurst',
        state: 'NC',
    },
];

const mockTeeTimes = [
    {
        courseId: 'mock-course-1',
        times: [
            { time: '2025-08-10T08:00:00', availableSpots: 4 },
            { time: '2025-08-10T09:30:00', availableSpots: 2 },
            { time: '2025-08-10T11:00:00', availableSpots: 3 },
            { time: '2025-08-10T14:30:00', availableSpots: 1 },
        ],
    },
    {
        courseId: 'mock-course-2',
        times: [
            { time: '2025-08-10T07:30:00', availableSpots: 4 },
            { time: '2025-08-10T10:00:00', availableSpots: 2 },
            { time: '2025-08-10T13:00:00', availableSpots: 4 },
        ],
    },
    {
        courseId: 'mock-course-3',
        times: [
            { time: '2025-08-10T09:00:00', availableSpots: 3 },
            { time: '2025-08-10T12:30:00', availableSpots: 1 },
            { time: '2025-08-10T15:00:00', availableSpots: 4 },
        ],
    },
    {
        courseId: 'club-champion-orlando',
        times: [
            { time: '2025-08-10T09:00:00', availableSpots: 3 },
            { time: '2025-08-10T12:30:00', availableSpots: 1 },
            { time: '2025-08-10T15:00:00', availableSpots: 4 },
        ]
    }
];

export const getNearbyCoursesMock = async (lat: number, lng: number): Promise<Course[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Filter courses based on proximity (rough calculation for demo)
    const nearbyThreshold = 5; // degrees (very rough approximation)
    const nearbyCourses = mockCourses.filter(course => {
        const latDiff = Math.abs(course.location.lat - lat);
        const lngDiff = Math.abs(course.location.lng - lng);
        return latDiff <= nearbyThreshold && lngDiff <= nearbyThreshold;
    });
    
    // If no nearby courses found, return a few random ones for development
    if (nearbyCourses.length === 0) {
        return mockCourses.slice(0, 4);
    }
    
    return nearbyCourses;
};



export const getNearbyCoursesReal = async (lat: number, lng: number): Promise<Course[]> => {
    const radius = 40000; // ~25 miles
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=golf_course&keyword=golf&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const results = response.data.results;

        // Filter: Keep results where name or types clearly indicate golf course
        const filteredResults = results.filter((place: any) => {
            const name = place.name?.toLowerCase() || '';
            const types = place.types || [];
            return (
                name.includes('golf') ||
                types.includes('golf_course') ||
                types.includes('point_of_interest') // extra leniency
            );
        });

        const courses: Course[] = await Promise.all(
            filteredResults.map(async (place: any) => {
                const { city, state } = await getPlaceDetails(place.place_id);
                return {
                    id: place.place_id,
                    name: place.name,
                    location: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng,
                    },
                    type: 'public', // defaulting to public for now
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

export const getNearbyCourses = async (lat: number, lng: number): Promise<Course[]> => {
    if (USE_MOCK_DATA) {
        console.log('Using mock data for development');
        return getNearbyCoursesMock(lat, lng);
    } else {
        console.log('Using real Google Maps API');
        return getNearbyCoursesReal(lat, lng);
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

export const getCourseDetails = async (courseId: string): Promise<Course | null> => {
    if (USE_MOCK_DATA) {
        return mockCourses.find(course => course.id === courseId) || null;
    } else {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${courseId}&fields=name,geometry,website,address_component&key=${GOOGLE_MAPS_API_KEY}`;
        try {
            const response = await axios.get(url);
            const result = response.data.result;
            if (result) {
                const { city, state } = await getPlaceDetails(courseId);
                return {
                    id: result.place_id,
                    name: result.name,
                    location: { lat: result.geometry.location.lat, lng: result.geometry.location.lng },
                    type: 'public', //Default
                    city,
                    state,
                    website: result.website
                }
            }
            return null;

        } catch (error){
            return null;
        }
    }
}

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
