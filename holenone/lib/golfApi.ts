// lib/golfApi.ts

import axios from 'axios';
// Import Course, TeeTime, BookingResponse from '@/types/golf'
import { Course, TeeTime, BookingResponse } from '@/types/golf'; 

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (typeof window === 'undefined' && !GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key incorrectly configured or missing on the server.');
}

const USE_MOCK_DATA = false; // Set to true to use mock data during development

// New type for API responses that include pagination tokens
export interface CoursesApiResponse {
    courses: Course[];
    nextPageToken?: string; // For Google Places API pagination
    nextOffset?: number; // For mock data pagination
}

// CustomCoordinates EXPORTED LOCALLY from golfApi.ts as per your request
export interface CustomCoordinates { 
    lat: number;
    lng: number;
}

// --- Helper Functions ---
function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

function kmToMiles(km: number): number {
    return km * 0.621371;
}

function milesToMeters(miles: number): number {
    return miles * 1609.34;
}

// --- Mock Data ---
const mockCourses: Course[] = [
    { id: 'mantua-local-links', name: 'Mantua Green Golf Course', location: { lat: 38.8700, lng: -77.2700 }, type: 'public', city: 'Fairfax', state: 'VA', distance: 1.1, priceLevel: 1, image: 'https://placehold.co/400x200/007bff/ffffff?text=Mantua+Golf' },
    { id: 'fairfax-park', name: 'Fairfax Park Golf', location: { lat: 38.8472, lng: -77.3069 }, type: 'public', city: 'Fairfax', state: 'VA', distance: 2.7, priceLevel: 1, image: 'https://placehold.co/400x200/28a745/ffffff?text=Fairfax+Golf' },
    { id: 'oakton-country-club', name: 'Oakton Country Club', location: { lat: 38.9050, lng: -77.3050 }, type: 'private', city: 'Oakton', state: 'VA', distance: 1.8, priceLevel: 2, image: 'https://placehold.co/400x200/ffc107/000000?text=Oakton+CC' },
    { id: 'potomac-ridge', name: 'Potomac Ridge Golf Course', location: { lat: 38.9200, lng: -77.4000 }, type: 'public', city: 'Reston', state: 'VA', distance: 8.0, priceLevel: 2, image: 'https://placehold.co/400x200/17a2b8/ffffff?text=Potomac+Ridge' },
    { id: 'gaineville-links', name: 'Gainesville Golf Center', location: { lat: 38.8150, lng: -77.5300 }, type: 'public', city: 'Gainesville', state: 'VA', distance: 20.0, priceLevel: 1, image: 'https://placehold.co/400x200/6f42c1/ffffff?text=Gainesville+Golf' },
    { id: 'mock-course-1', name: 'Pebble Beach Golf Links', location: { lat: 36.5681, lng: -121.9486 }, type: 'public', city: 'Pebble Beach', state: 'CA', distance: 2500, priceLevel: 4, image: 'https://placehold.co/400x200/dc3545/ffffff?text=Pebble+Beach' },
    { id: 'mock-course-2', name: 'Augusta National Golf Club', location: { lat: 33.5030, lng: -82.0199 }, type: 'private', city: 'Augusta', state: 'GA', distance: 600, priceLevel: 4, image: 'https://placehold.co/400x200/fd7e14/ffffff?text=Augusta+National' },
    { id: 'mock-course-3', name: 'Pinehurst Resort', location: { lat: 35.1972, lng: -79.4792 }, type: 'public', city: 'Pinehurst', state: 'NC', distance: 300, priceLevel: 3, image: 'https://placehold.co/400x200/4CAF50/ffffff?text=Pinehurst' },
    { id: 'mock-course-4', name: 'Bandon Dunes Golf Resort', location: { lat: 43.1972, lng: -124.3892 }, type: 'public', city: 'Bandon', state: 'OR', distance: 2800, priceLevel: 4, image: 'https://placehold.co/400x200/FF5722/ffffff?text=Bandon+Dunes' },
    { id: 'mock-course-5', name: 'Whistling Straits', location: { lat: 43.7650, lng: -87.7750 }, type: 'public', city: 'Sheboygan', state: 'WI', distance: 700, priceLevel: 4, image: 'https://placehold.co/400x200/607D8B/ffffff?text=Whistling+Straits' },
    { id: 'mock-course-6', name: 'Erin Hills Golf Course', location: { lat: 43.2750, lng: -88.3750 }, type: 'public', city: 'Erin', state: 'WI', distance: 700, priceLevel: 3, image: 'https://placehold.co/400x200/795548/ffffff?text=Erin+Hills' },
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


// --- Main Functions ---

export const getNearbyCoursesMock = async (
    lat: number, 
    lng: number, 
    radiusMiles: number = 25, 
    offset: number = 0, 
    limit: number = 4 
): Promise<CoursesApiResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const nearbyCourses: Course[] = [];
    for (const course of mockCourses) {
        const actualDistanceKm = getDistanceFromLatLonInKm(lat, lng, course.location.lat, course.location.lng);
        const actualDistanceMiles = kmToMiles(actualDistanceKm);

        if (actualDistanceMiles <= radiusMiles) {
            nearbyCourses.push({
                ...course,
                distance: course.distance !== undefined ? course.distance : parseFloat(actualDistanceMiles.toFixed(1))
            });
        }
    }
    
    nearbyCourses.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    const paginatedCourses = nearbyCourses.slice(offset, offset + limit);
    const nextOffset = offset + limit < nearbyCourses.length ? offset + limit : undefined;

    if (paginatedCourses.length === 0 && offset === 0) {
        console.warn(`No mock courses found within ${radiusMiles} miles of ${lat},${lng}. Returning some distant ones.`);
        const fallbackCourses = mockCourses.slice(0, limit).map(course => ({
            ...course,
            distance: parseFloat(kmToMiles(getDistanceFromLatLonInKm(lat, lng, course.location.lat, course.location.lng)).toFixed(1))
        }));
        return { courses: fallbackCourses, nextOffset: limit < mockCourses.length ? limit : undefined };
    }
    
    return { courses: paginatedCourses, nextOffset };
};


export const getNearbyCoursesReal = async (
    lat: number, 
    lng: number, 
    radiusMiles: number = 25, 
    apiKey: string,
    pageToken?: string 
): Promise<CoursesApiResponse> => {
    const radiusMeters = Math.min(milesToMeters(radiusMiles), 50000); 
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const fieldsToRequest = [
        'places.id',
        'places.displayName',
        'places.location',
        'places.rating',
        'places.priceLevel',
        'places.websiteUri',
        'places.types',
        'places.photos', 
    ].join(',');

    const requestBody: any = {
        locationRestriction: {
            circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,
            },
        },
        includedTypes: ['golf_course'],
        rankPreference: 'DISTANCE',
        // pageSize: 4, // REMOVED: This parameter is not supported by Places API (New) searchNearby
    };

    if (pageToken) {
        requestBody.pageToken = pageToken; 
    }

    try {
        const response = await axios.post(
            url,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': fieldsToRequest,
                },
            }
        );

        // Do NOT explicitly slice to limit to 4 results here.
        // The Places API (New) will return a default number of results per page (e.g., up to 20).
        // The AI will then select the top 4 from this list.
        const places = response.data.places; 
        const newPageToken = response.data.nextPageToken; 

        if (!places || places.length === 0) {
            return { courses: [], nextPageToken: newPageToken };
        }

        const courses: Course[] = await Promise.all(
            places.map(async (place: any) => {
                const courseId = place.id;
                const courseName = place.displayName?.text;
                const courseLat = place.location?.latitude;
                const courseLng = place.location?.longitude;
                const courseRating = place.rating;
                const coursePriceLevel = place.priceLevel;
                const courseWebsite = place.websiteUri;
                const courseTypes = place.types || [];
                
                const photoReferenceName = place.photos?.[0]?.name;
                const imageUrl = photoReferenceName ? `https://places.googleapis.com/v1/${photoReferenceName}/media?key=${apiKey}&maxWidthPx=400` : undefined;


                let city = 'N/A';
                let state = 'N/A';
                if (courseId) {
                    try {
                        const placeDetails = await getPlaceDetails(courseId, apiKey);
                        if (placeDetails) {
                            city = placeDetails.city || city;
                            state = placeDetails.state || state;
                        }
                    } catch (detailError) {
                        console.warn(`Could not fetch details for ${courseName} (ID: ${courseId}):`, detailError);
                    }
                }

                const distanceKm = getDistanceFromLatLonInKm(lat, lng, courseLat, courseLng);
                const distanceMiles = parseFloat(kmToMiles(distanceKm).toFixed(1));

                return {
                    id: courseId,
                    name: courseName,
                    location: {
                        lat: courseLat,
                        lng: courseLng,
                    },
                    type: courseTypes.includes('golf_course') ? 'public' : 'public',
                    city,
                    state,
                    distance: distanceMiles,
                    rating: courseRating,
                    priceLevel: coursePriceLevel,
                    website: courseWebsite,
                    photo: imageUrl, 
                    image: imageUrl, 
                };
            })
        );

        return { courses, nextPageToken: newPageToken };
    } catch (error: any) {
        console.error('Error fetching nearby golf courses with New Places API:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        throw error;
    }
};

export const getNearbyCourses = async (
    lat: number, 
    lng: number, 
    radiusMiles: number = 25, 
    apiKey: string,
    pageToken?: string, 
    offset?: number 
): Promise<CoursesApiResponse> => {
    if (USE_MOCK_DATA) {
        console.log('Using mock data for development');
        return getNearbyCoursesMock(lat, lng, radiusMiles, offset); 
    } else {
        console.log('Using real Google Maps API');
        return getNearbyCoursesReal(lat, lng, radiusMiles, apiKey, pageToken); 
    }
};


export const getPlaceDetails = async (placeId: string, apiKey: string): Promise<{ city: string; state: string }> => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,website&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const result = response.data.result;
        const components = result?.address_components || [];

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


const fetchGeocode = async (address: string): Promise<CustomCoordinates> => { 
    try {
        const response = await axios.get(`/api/geocode?address=${encodeURIComponent(address)}`);
        return response.data; 
    } catch (error) {
        console.error("Error calling /api/geocode:", error);
        throw new Error("Failed to geocode address via API.");
    }
};

export const getUserLocation = async (): Promise<CustomCoordinates> => {
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
            // Log the specific error from Geolocation API
            console.error(`Geolocation API failed: ${error.message}. Please check browser permissions and ensure you are on a secure connection (HTTPS).`);
            // Do NOT re-throw here, allow fallback to proceed
        }
    } else {
        console.warn("Geolocation is not supported by this browser or not running in a browser context.");
    }

    // Fallback to geocoding a specific address if geolocation failed or is not supported
    try {
        const defaultLocationQuery = "Mantua, Fairfax, Virginia, USA"; 
        console.log(`Attempting to geocode fallback address: "${defaultLocationQuery}"`);
        const defaultCoords = await fetchGeocode(defaultLocationQuery); 
        console.log("Using fallback geocoded location:", defaultCoords.lat, defaultCoords.lng, "from query:", defaultLocationQuery);
        return defaultCoords;
    } catch (geocodeError: any) {
        console.error("Failed to get any location (geolocation failed and geocoding fallback failed):", geocodeError);
        const hardcodedMantuaCoords = { lat: 38.8687, lng: -77.2684 }; 
        console.log("Using hardcoded fallback coordinates for Mantua, VA:", hardcodedMantuaCoords.lat, hardcodedMantuaCoords.lng);
        return hardcodedMantuaCoords;
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
