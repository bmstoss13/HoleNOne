export interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
    website?: string; // Important for the AI agent
}

// Make sure these are EXPORTED
export interface TeeTime {
    time: string;
    availableSlots: number;
    // Potentially add more fields that the WebAgent might extract
    price?: string;
    bookingUrl?: string; // If a direct booking link is found
}

// You might also have other types from golfApi.ts that you want to share
export interface BookingResponse {
    bookingId: string;
    courseId: string;
    time: string;
    players: number;
    status: string;
}