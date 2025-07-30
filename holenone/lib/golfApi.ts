// lib/golfApi.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { CustomCoordinates } from '@/types/golf';
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key incorrectly configured or missing.');
}

const USE_MOCK_DATA = false;

// Types
interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
    website?: string;
    distance?: number;
    rating?: number;
    price?: number;
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
    { id: 'mantua-local-links', name: 'Mantua Green Golf Course', location: { lat: 38.8700, lng: -77.2700 }, type: 'public', city: 'Fairfax', state: 'VA', distance: 1.1, price: 50},
    { id: 'fairfax-park', name: 'Fairfax Park Golf', location: { lat: 38.8472, lng: -77.3069 }, type: 'public', city: 'Fairfax', state: 'VA', distance: 2.7, price: 40 }, // Near Burke Lake
    { id: 'oakton-country-club', name: 'Oakton Country Club', location: { lat: 38.9050, lng: -77.3050 }, type: 'private', city: 'Oakton', state: 'VA', distance: 1.8 },
    { id: 'potomac-ridge', name: 'Potomac Ridge Golf Course', location: { lat: 38.9200, lng: -77.4000 }, type: 'public', city: 'Reston', state: 'VA', distance: 50 },
    { id: 'gaineville-links', name: 'Gainesville Golf Center', location: { lat: 38.8150, lng: -77.5300 }, type: 'public', city: 'Gainesville', state: 'VA', distance: 10 },
    // Keep some of your original mock courses but update their distance to a number
    { id: 'mock-course-1', name: 'Pebble Beach Golf Links', location: { lat: 36.5681, lng: -121.9486 }, type: 'public', city: 'Pebble Beach', state: 'CA', distance: 2500 }, // Example large distance
    { id: 'mock-course-2', name: 'Augusta National Golf Club', location: { lat: 33.5030, lng: -82.0199 }, type: 'private', city: 'Augusta', state: 'GA', distance: 600 },
    {
        
        id: 'mock-course-1',
        name: 'Pebble Beach Golf Links',
        location: { lat: 36.5681, lng: -121.9486 },
        type: 'public',
        city: 'Pebble Beach',
        state: 'CA',
        distance: 5
    },
    {
        id: 'mock-course-2',
        name: 'Augusta National Golf Club',
        location: { lat: 33.5030, lng: -82.0199 },
        type: 'private',
        city: 'Augusta',
        state: 'GA',
        distance: 5
    },
    {
        id: 'mock-course-3',
        name: 'St. Andrews Links',
        location: { lat: 56.3490, lng: -2.8007 },
        type: 'public',
        city: 'St Andrews',
        state: 'SCT',
        distance: 5
    },
    {
        id: 'mock-course-4',
        name: 'Torrey Pines Golf Course',
        location: { lat: 32.8946, lng: -117.2516 },
        type: 'public',
        city: 'La Jolla',
        state: 'CA',
        distance: 5
    },
    {
        id: 'mock-course-5',
        name: 'Whistling Straits',
        location: { lat: 43.6374, lng: -87.7367 },
        type: 'private',
        city: 'Sheboygan',
        state: 'WI',
        distance: 5
    },
    {
        id: 'mock-course-6',
        name: 'Topgolf Austin',
        location: { lat: 30.1975, lng: -81.3937 },
        type: 'public',
        city: 'Austin',
        state: 'Tx',
        website: 'https://www.fairfaxcounty.gov/parks/golf/burke-lake',
        distance: 5
    },
    {
        id: 'mock-course-7',
        name: 'Bethpage Black',
        location: { lat: 40.7452, lng: -73.4618 },
        type: 'public',
        city: 'Farmingdale',
        state: 'NY',
        distance: 5
    },
    {
        id: 'mock-course-8',
        name: 'Pinehurst No. 2',
        location: { lat: 35.1954, lng: -79.4662 },
        type: 'public',
        city: 'Pinehurst',
        state: 'NC',
        distance: 5
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

export const getNearbyCoursesMock = async (lat: number, lng: number, radiusMiles: number = 25): Promise<Course[]> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

    const nearbyCourses: Course[] = [];
    for (const course of mockCourses) {
        const distanceKm = getDistanceFromLatLonInKm(lat, lng, course.location.lat, course.location.lng);
        const distanceMiles = kmToMiles(distanceKm);

        if (distanceMiles <= radiusMiles) {
            nearbyCourses.push({ ...course, distance: parseFloat(distanceMiles.toFixed(1)) }); // Add distance, formatted
        }
    }
    
    // If no nearby courses found, return a few random ones for development or handle as desired
    if (nearbyCourses.length === 0) {
        // Return some courses regardless for dev, but mark their distance as beyond radius
        console.warn(`No mock courses found within ${radiusMiles} miles. Returning some distant ones.`);
        return mockCourses.slice(0, 4).map(course => ({
            ...course,
            distance: parseFloat(kmToMiles(getDistanceFromLatLonInKm(lat, lng, course.location.lat, course.location.lng)).toFixed(1))
        }));
    }
    
    return nearbyCourses;
};



export const getNearbyCoursesReal = async (lat: number, lng: number, radiusMiles: number = 25): Promise<Course[]> => {
    const radiusMeters = Math.min(milesToMeters(radiusMiles), 50000); // Max radius for Nearby Search is 50,000 meters

    // New Places API Endpoint
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    try {
        const response = await axios.post(
            url,
            {
                // Request Body for the New Places API searchNearby
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: radiusMeters,
                    },
                },
                includedTypes: ['golf_course'], // Specific type for golf courses
                rankPreference: 'DISTANCE', // Rank by distance (or 'POPULARITY' if preferred)
                // --- CRUCIAL: fieldMask to request specific fields ---
                // websiteUri is the new field name for website
                // priceLevel should still be priceLevel or check new docs for exact name
                // rating and displayName are common
                //fieldMask: 'places.displayName,places.location,places.rating,places.priceLevel,places.websiteUri,places.id,places.types',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.location,places.rating,places.priceLevel,places.websiteUri,places.id,places.types', // Redundant but often included
                },
            }
        );

        const places = response.data.places; // The actual list of places is now under 'places'

        if (!places || places.length === 0) {
            return [];
        }

        const courses: Course[] = await Promise.all(
            places.map(async (place: any) => {
                // The structure of the 'place' object is different in the new API
                // For example, name is now displayName, location has latitude/longitude directly
                const courseName = place.displayName?.text;
                const courseId = place.id;
                const courseLat = place.location?.latitude;
                const courseLng = place.location?.longitude;
                const courseRating = place.rating;
                const coursePriceLevel = place.priceLevel; // Should be here if requested and available
                const courseWebsite = place.websiteUri; // Should be here if requested and available
                const courseTypes = place.types || [];

                // You might still need getPlaceDetails for city/state if not directly in searchNearby response
                // or if you want to use address_components from Place Details.
                // However, for website and priceLevel, they should be here now.
                const { city, state } = await getPlaceDetails(courseId); // Still assuming getPlaceDetails uses the old API or is adapted.

                const distanceKm = getDistanceFromLatLonInKm(lat, lng, courseLat, courseLng);
                const distanceMiles = kmToMiles(distanceKm);

                return {
                    id: courseId,
                    name: courseName,
                    location: {
                        lat: courseLat,
                        lng: courseLng,
                    },
                    type: courseTypes.includes('public_golf_course') ? 'public' : 'private', // Example type mapping
                    city, // From getPlaceDetails
                    state, // From getPlaceDetails
                    distance: parseFloat(distanceMiles.toFixed(1)),
                    rating: courseRating,
                    priceLevel: coursePriceLevel,
                    website: courseWebsite,
                    image: undefined // Assuming images are not in nearby search or not yet implemented
                };
            })
        );

        return courses;
    } catch (error) {
        console.error('Error fetching nearby golf courses with New Places API:', error);
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

export const getUserLocation = async (): Promise<CustomCoordinates> => { // Make this async as we'll use await
    // Try to get geolocation first (client-side only)
    if (typeof window !== 'undefined' && navigator.geolocation) {
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });
            console.log("Geolocation API success! Using precise coordinates:", position.coords.latitude, position.coords.longitude);
            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
        } catch (error: any) {
            console.warn("Geolocation API failed:", error.message);
            // Fallback to geocoding if geolocation fails
            // Do NOT return here, proceed to the fallback block
        }
    } else {
        console.warn("Geolocation is not supported by this browser or not running in a browser context.");
        // Proceed to fallback block
    }

    // --- Fallback to geocoding a specific address ---
    try {
        // Use a very specific address for Mantua, VA as the default fallback
        const defaultLocationQuery = "Mantua, Fairfax, Virginia, USA"; 
        
        console.log(`Geolocation failed. Attempting to geocode fallback address: "${defaultLocationQuery}"`);
        const defaultCoords = await fetchGeocode(defaultLocationQuery);
        console.log("Using fallback geocoded location:", defaultCoords.lat, defaultCoords.lng, "from query:", defaultLocationQuery);
        return defaultCoords;
    } catch (geocodeError: any) {
        console.error("Failed to get any location (geolocation failed and geocoding fallback failed):", geocodeError);
        // As a last resort, provide hardcoded coordinates for Mantua, VA
        const hardcodedMantuaCoords = { lat: 38.8687, lng: -77.2684 }; 
        console.log("Using hardcoded fallback coordinates for Mantua, VA:", hardcodedMantuaCoords.lat, hardcodedMantuaCoords.lng);
        return hardcodedMantuaCoords;
    }
};

const fetchGeocode = async (address: string): Promise<CustomCoordinates> => {
    try {
        const response = await axios.get(`/api/geocode?address=${encodeURIComponent(address)}`);
        return response.data; // This should return { lat: number, lng: number }
    } catch (error) {
        console.error("Error calling /api/geocode:", error);
        throw new Error("Failed to geocode address via API.");
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

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

function kmToMiles(km: number): number {
    return km * 0.621371;
}

// Function to convert miles to meters (for Google Places API)
function milesToMeters(miles: number): number {
    return miles * 1609.34;
}
