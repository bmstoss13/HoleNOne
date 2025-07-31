// types/golf.ts

export interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
    website?: string;
    distance?: number;
    rating?: number;
    priceLevel?: number;
    photo?: string; // Existing photo property for raw Google Places photo URL
    image?: string; // <--- ADDED: Optional image property for display in CourseCard
}

export interface CustomCoordinates {
    lat: number;
    lng: number;
}

export interface TeeTime {
    time: string;
    availableSpots: number;
}

export interface BookingResponse {
    bookingId: string;
    courseId: string;
    time: string;
    players: number;
    status: string;
}
