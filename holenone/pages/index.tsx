// pages/index.tsx

import React, { useState, useEffect } from "react";
import SearchBar from './components/SearchBar';
import QuickAction from './components/QuickAction';
import CourseList from './components/CourseList';
import styles from './styling/index.module.css';
 // Adjust this path if getUserLocation is elsewhere

// Re-declare interfaces if they're not globally available or imported
interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
}

interface ApiResponse {
    courses: Course[];
}
// Wherever getUserLocation is defined (if it's in index.tsx, then it's there)

interface CustomCoordinates { // Define a simple interface for clarity
    lat: number;
    lng: number;
}

const getUserLocation = (): Promise<CustomCoordinates> => { // <--- CHANGE THIS LINE
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            error => {
                let errorMessage = "Failed to retrieve user location.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Geolocation permission denied by the user.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "The request to get user location timed out.";
                        break;
                    default:
                        errorMessage = "An unknown geolocation error occurred.";
                        break;
                }
                console.error("Geolocation Error:", errorMessage, error);
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};

export default function Home() {
    const [searchResults, setSearchResults] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false); // Renamed to avoid conflict
    
    // New state for user location
    const [userCoordinates, setUserCoordinates] = useState<CustomCoordinates | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true); // Initially loading location
    const [locationError, setLocationError] = useState<string | null>(null);

    // --- EFFECT HOOK TO GET USER LOCATION ON COMPONENT MOUNT ---
    useEffect(() => {
        const fetchUserLocation = async () => {
            setLoadingLocation(true);
            setLocationError(null);
            try {
                const coords = await getUserLocation();
                // GeolocationCoordinates object from navigator.geolocation
                // has lat/lng under .coords property
                setUserCoordinates(coords);
            } catch (err: any) {
                console.error("Failed to get user location:", err);
                setLocationError(err.message || "Unable to get your current location.");
            } finally {
                setLoadingLocation(false);
            }
        };

        fetchUserLocation();
    }, []); // Empty dependency array means this runs once on mount

    const handleSearch = async (
        query: string,
        date: string,
        players: number,
        // The location parameter from SearchBar can be used if it's dynamic
        // Otherwise, we'll use userCoordinates if available
        searchLocation?: CustomCoordinates
    ) => {
        // Use the passed searchLocation if available, otherwise fall back to userCoordinates
        const locationToSend = searchLocation || userCoordinates;

        if (!locationToSend) {
            alert("Please allow location access or provide a location to search for courses.");
            return;
        }

        setLoadingCourses(true); // Indicate that courses are loading
        try {
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    date,
                    players,
                    lat: locationToSend.lat,  // Pass latitude
                    lng: locationToSend.lng  // Pass longitude
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API error: ${response.status}`);
            }

            const data: ApiResponse = await response.json();
            setSearchResults(data.courses);

        } catch (err: any) {
            console.error("Error fetching courses:", err.message);
            setSearchResults([]); // Clear results on error
        } finally {
            setLoadingCourses(false); // Courses loading finished
        }
    };

    return (
        <div className={styles['home-page-container']}>
            <div className={styles['home-page-header']}>
                <h1>Hole 'N One</h1>
                <p>Book your tee in no time.</p>
            </div>

            {loadingLocation && <p>Loading your current location...</p>}
            {locationError && <p style={{ color: 'red' }}>Location Error: {locationError}</p>}
            
            {/* Render SearchBar and QuickActions only after location is loaded or if there's an error */}
            {!loadingLocation && (
                <>
                    {/* SearchBar needs to be updated to pass userCoordinates or allow manual input */}
                    {/* For now, assuming SearchBar's onSearch can receive a location directly or implicitly uses userCoordinates */}
                    <SearchBar onSearch={handleSearch} /> 

                    <div className="quick-actions">
                        {/* Now pass userCoordinates to QuickAction clicks */}
                        <QuickAction 
                            text="Morning Tee Times" 
                            onClick={() => handleSearch('morning', '', 1, userCoordinates || undefined)} 
                        />
                        <QuickAction 
                            text="Affordable Rounds" 
                            onClick={() => handleSearch('budget friendly', '', 1, userCoordinates || undefined)} 
                        />
                        <QuickAction 
                            text="Championship Courses" 
                            onClick={() => handleSearch('championship', '', 1, userCoordinates || undefined)} 
                        />
                        <QuickAction 
                            text="Beginner Friendly" 
                            onClick={() => handleSearch('beginner', '', 1, userCoordinates || undefined)} 
                        />
                    </div>
                </>
            )}


            {loadingCourses && <p>Loading nearby courses...</p>}
            
            {!loadingCourses && searchResults.length === 0 && userCoordinates && !locationError && (
                <p>No courses found near your location. Try a different search!</p>
            )}
            {!loadingCourses && searchResults.length === 0 && !userCoordinates && !locationError && (
                <p>Allow location access to find nearby courses.</p>
            )}

            <CourseList courses={searchResults} />
        </div>
    );
}