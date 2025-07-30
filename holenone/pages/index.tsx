// pages/index.tsx

import React, { useState, useEffect } from "react";
import SearchBar from './components/SearchBar';
import QuickAction from './components/QuickAction';
import CourseList from './components/CourseList';
import styles from './styling/index.module.css';

// Re-declare interfaces, ensuring they match the backend interfaces for consistency
interface Course {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    city: string;
    state: string;
    rating?: number; // Optional, as it might be N/A
    priceLevel?: number; // Optional, as it might be N/A
    distance?: number; // Optional, as it might be N/A
    website?: string;
}

// The response structure from /api/search.ts
interface SearchApiResponse {
    topPick: string;
    explanation: string;
    courses: Course[]; // This will be the ranked courses
}

interface CustomCoordinates {
    lat: number;
    lng: number;
}

// This function should ideally be in a shared utility file (e.g., lib/golfApi.ts)
// but keeping it here for now as per your provided context.
const getUserLocation = (): Promise<CustomCoordinates> => {
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
    const [loadingCourses, setLoadingCourses] = useState(false);
    
    const [userCoordinates, setUserCoordinates] = useState<CustomCoordinates | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);

    const [quickActionDate, setQuickActionDate] = useState(new Date().toISOString().slice(0, 10));

    // New states to store the LLM's top pick and explanation
    const [topPick, setTopPick] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);


    // --- EFFECT HOOK TO GET USER LOCATION ON COMPONENT MOUNT ---
    useEffect(() => {
        const fetchUserLocation = async () => {
            setLoadingLocation(true);
            setLocationError(null);
            try {
                const coords = await getUserLocation();
                setUserCoordinates(coords);
            } catch (err: any) {
                console.error("Failed to get user location:", err);
                setLocationError(err.message || "Unable to get your current location.");
            } finally {
                setLoadingLocation(false);
            }
        };

        fetchUserLocation();
    }, []);

    // --- UPDATED handleSearch function to call /api/search ---
    const handleSearch = async (
        query: string,
        date: string,
        players: number,
        locationCoords?: CustomCoordinates,
        timeOfDay?: string // This parameter is now passed to /api/search
    ) => {
        setLoadingCourses(true);
        setTopPick(null); // Clear previous LLM results
        setExplanation(null);
        setSearchResults([]); // Clear previous course results

        const finalCoordinates = locationCoords || userCoordinates;

        if (!finalCoordinates) {
            alert("Please provide a valid location or allow location access.");
            setLoadingCourses(false);
            return;
        }

        try {
            // Call the new /api/search endpoint
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    date,
                    players,
                    lat: finalCoordinates.lat,
                    lng: finalCoordinates.lng,
                    timeOfDay // Pass timeOfDay to the search API
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API error: ${response.status}`);
            }

            // Parse the response from /api/search
            const data: SearchApiResponse = await response.json();

            setTopPick(data.topPick);
            setExplanation(data.explanation);
            setSearchResults(data.courses); // These are already ranked by the LLM

        } catch (err: any) {
            console.error("Error fetching search results:", err.message);
            setSearchResults([]);
            setTopPick(null);
            setExplanation(null);
        } finally {
            setLoadingCourses(false);
        }
    };

    return (
        <div className={styles['home-page-container']}>
            <div className={styles['home-page-header']}>
                {/* <h1>Hole 'N One</h1>
                <p>Book your tee in no time.</p> */}
            </div>

            {loadingLocation && <p>Loading your current location...</p>}
            {locationError && <p style={{ color: 'red' }}>Location Error: {locationError}</p>}
            
            {!loadingLocation && (
                <>
                    <SearchBar onSearch={handleSearch} /> 

                    {/* Quick Actions - always visible */}
                    <div className="quick-actions">
                        <QuickAction 
                            text="Morning Tee Times" 
                            onClick={() => handleSearch('morning', quickActionDate, 1, userCoordinates || undefined, "Morning")} 
                        />
                        <QuickAction 
                            text="Affordable Rounds" 
                            onClick={() => handleSearch('budget friendly', quickActionDate, 1, userCoordinates || undefined, "Any")} 
                        />
                        <QuickAction 
                            text="Championship Courses" 
                            onClick={() => handleSearch('championship', quickActionDate, 1, userCoordinates || undefined, "Any")} 
                        />
                        <QuickAction 
                            text="Beginner Friendly" 
                            onClick={() => handleSearch('beginner', quickActionDate, 1, userCoordinates || undefined, "Any")} 
                        />
                    </div>

                    {loadingCourses ? (
                        <p>Finding courses and generating recommendations...</p>
                    ) : (
                        <>
                            {topPick && explanation && (
                                <div className={styles['llm-recommendation']}>
                                    <h2>Top Pick: {topPick}</h2>
                                    <p>{explanation}</p>
                                </div>
                            )}

                            {searchResults.length > 0 ? (
                                <CourseList courses={searchResults} />
                            ) : (
                                <p>No courses found. Try a different search!</p>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}