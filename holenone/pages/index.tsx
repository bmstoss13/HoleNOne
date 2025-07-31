// pages/index.tsx

import React, { useState, useEffect } from "react";
import SearchBar from './components/SearchBar';
import QuickAction from './components/QuickAction';
import CourseList from './components/CourseList';
import Chatbot from './components/Chatbot'; 
import styles from './styling/index.module.css';
// Import CustomCoordinates and getUserLocation from your lib/golfApi.ts
import { CustomCoordinates, getUserLocation } from '../lib/golfApi'; 
// Import Course from your shared types file
import { Course } from '@/types/golf'; 
// Import Bot and MessageSquare icons
import { Sunrise, Wallet, Trophy, Flag, AlertCircle, Bot, MessageSquare } from 'lucide-react';

// The updated response structure from /api/search.ts
interface SearchApiResponse {
    aiRecommendedCourses: Course[]; // The top 4 AI-recommended courses
    allFetchedCourses: Course[]; // ALL courses fetched from the Places API
    topPick: string;
    explanation: string;
    nextPageToken?: string;
    nextOffset?: number;
}

export default function Home() {
    // State to hold AI-recommended courses (top 4)
    const [aiRecommendedCourses, setAiRecommendedCourses] = useState<Course[]>([]);
    // State to hold ALL courses fetched from the API
    const [allFetchedCourses, setAllFetchedCourses] = useState<Course[]>([]);
    // State to control which list of courses is currently displayed
    const [showAllCoursesView, setShowAllCoursesView] = useState(false); 

    const [loadingCourses, setLoadingCourses] = useState(false);
    
    const [userCoordinates, setUserCoordinates] = useState<CustomCoordinates | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);

    const [quickActionDate, setQuickActionDate] = useState(new Date().toISOString().slice(0, 10));

    const [topPick, setTopPick] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);

    // Chatbot state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);

    // New state for controlling initial page layout vs. results layout
    const [hasSearched, setHasSearched] = useState(false);


    // Pagination state (retained from your previous code, though its direct use for "Load More"
    // is now primarily for fetching *additional* pages, not just toggling view of current results)
    const [currentSearchQuery, setCurrentSearchQuery] = useState<any>(null); // Using 'any' for simplicity for now
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [nextOffset, setNextOffset] = useState<number | undefined>(undefined);
    const [hasMorePages, setHasMorePages] = useState(false); // Renamed for clarity: indicates more pages available from API


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

    // --- Main Search Function ---
    const executeSearch = async (
        query: string,
        date: string,
        players: number,
        locationCoords: CustomCoordinates,
        timeOfDay?: string,
        isLoadMorePagination: boolean = false, // Flag to distinguish initial search from loading more pages
        currentPageToken?: string,
        currentOffset?: number
    ) => {
        setLoadingCourses(true);
        setHasSearched(true); // Set hasSearched to true once a search is initiated
        
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    date,
                    players,
                    lat: locationCoords.lat,
                    lng: locationCoords.lng,
                    timeOfDay,
                    pageToken: currentPageToken,
                    offset: currentOffset
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API error: ${response.status}`);
            }

            const data: SearchApiResponse = await response.json();

            if (!isLoadMorePagination) {
                // For initial search, reset results and set top pick/explanation
                setAiRecommendedCourses(data.aiRecommendedCourses);
                setAllFetchedCourses(data.allFetchedCourses);
                setTopPick(data.topPick);
                setExplanation(data.explanation);
                setShowAllCoursesView(false); // Always default to AI picks on a new search
                setChatInitialMessage(data.explanation); // Set the explanation as initial message for chat
            } else {
                // For "Load More" (pagination), append new courses to allFetchedCourses
                // Note: AI recommendations are only for the initial set.
                setAllFetchedCourses(prevResults => [...prevResults, ...data.allFetchedCourses]);
            }

            // Update pagination tokens/offsets
            setNextPageToken(data.nextPageToken);
            setNextOffset(data.nextOffset);
            setHasMorePages(!!data.nextPageToken || !!data.nextOffset); // True if either token/offset exists

        } catch (err: any) {
            console.error("Error fetching search results:", err.message);
            if (!isLoadMorePagination) { 
                setAiRecommendedCourses([]);
                setAllFetchedCourses([]);
                setTopPick(null);
                setExplanation(null);
                setChatInitialMessage(undefined); // Clear initial message on error
            }
            setHasMorePages(false); 
        } finally {
            setLoadingCourses(false);
        }
    };

    // --- Wrapper for initial search (called by SearchBar and QuickActions) ---
    const handleInitialSearch = async (
        query: string,
        date: string,
        players: number,
        locationCoords?: CustomCoordinates,
        timeOfDay?: string
    ) => {
        const finalCoordinates = locationCoords || userCoordinates;

        if (!finalCoordinates) {
            alert("Please provide a valid location or allow location access.");
            return;
        }

        // Store current search parameters for potential "Load More" pagination
        setCurrentSearchQuery({ query, date, players, locationCoords: finalCoordinates, timeOfDay });

        // Execute initial search (no pageToken or offset for the first call)
        await executeSearch(query, date, players, finalCoordinates, timeOfDay, false, undefined, 0);
    };

    // --- "Load More Pages" handler (for pagination beyond initial fetch) ---
    const handleLoadMorePages = async () => {
        if (!currentSearchQuery || loadingCourses || !hasMorePages) return;

        // Use the stored search parameters and current pagination tokens/offsets
        await executeSearch(
            currentSearchQuery.query,
            currentSearchQuery.date,
            currentSearchQuery.players,
            currentSearchQuery.locationCoords!, 
            currentSearchQuery.timeOfDay,
            true, // This is a load more pagination request
            nextPageToken, 
            nextOffset 
        );
    };

    // --- "Clear Search" handler ---
    const handleClearSearch = () => {
        setAiRecommendedCourses([]);
        setAllFetchedCourses([]);
        setTopPick(null);
        setExplanation(null);
        setShowAllCoursesView(false); // Reset view
        setCurrentSearchQuery(null);
        setNextPageToken(undefined);
        setNextOffset(undefined);
        setHasMorePages(false);
        setIsChatOpen(false); // Close chat on clear search
        setChatInitialMessage(undefined); // Clear initial message
        setHasSearched(false); // Reset hasSearched to false to return to initial layout
    };

    // Determine which list of courses to display based on the toggle
    const coursesToDisplay = showAllCoursesView ? allFetchedCourses : aiRecommendedCourses;

    // Determine if the "Show All/AI Picks" toggle button should be visible
    // It's visible if we have AI picks AND there are more courses in the full list than AI picks.
    const showToggleAllCoursesButton = aiRecommendedCourses.length > 0 && allFetchedCourses.length > aiRecommendedCourses.length;

    return (
        <div className={`${styles['home-page-container']} ${hasSearched ? styles['home-page-container-searched'] : ''}`}>
            {loadingLocation && (
                <div className={styles['loading-overlay']}>
                    <div className={styles['loading-spinner']}></div>
                    <p className={styles['loading-location-message']}>Finding nearby courses...</p>
                </div>
            )}
            {locationError && (
                <div className={styles['error-overlay']}>
                <p className={styles['location-error-message']}>
                    <AlertCircle size={20} /> Location Error: {locationError}
                </p>
                </div>
            )}
            
            {!loadingLocation && (
                <>
                    {/* Wrapper for SearchBar and QuickActions (and now Header) to control their positioning */}
                    <div className={`${styles['search-and-actions-wrapper']} ${hasSearched ? styles['search-and-actions-wrapper-active'] : ''}`}>
                        {/* Header is only visible if no search has been performed */}
                        {!hasSearched && (
                            <div className={styles['home-page-header']}>
                                <h1>Hole In One</h1>
                                <p>Book your tee. At ANY time. In NO time.</p>
                            </div>
                        )}
                        <SearchBar onSearch={handleInitialSearch} /> 

                        {/* Quick Actions are shown only when no search results are displayed AND no search has been performed yet */}
                    {(!hasSearched && aiRecommendedCourses.length === 0 && allFetchedCourses.length === 0 && !topPick) && (
                        <div className={styles['quick-actions-container']}>
                            <h3 className={styles['quick-actions-title']}>Don't know where to start? Give these a try!</h3>
                            <div className={styles['quick-actions']}>
                                <QuickAction 
                                    icon={<Sunrise size={24} />}
                                    text="Morning Tee Times" 
                                    onClick={() => handleInitialSearch('morning', quickActionDate, 1, userCoordinates || undefined, "Morning")} 
                                />
                                <QuickAction 
                                    icon={<Wallet size={24} />}
                                    text="Affordable Rounds" 
                                    onClick={() => handleInitialSearch('budget friendly', quickActionDate, 1, userCoordinates || undefined, "Any")} 
                                />
                                <QuickAction 
                                    icon={<Trophy size={24} />}
                                    text="Championship Courses" 
                                    onClick={() => handleInitialSearch('championship', quickActionDate, 1, userCoordinates || undefined, "Any")} 
                                />
                                <QuickAction 
                                    icon={<Flag size={24} />}
                                    text="Beginner Friendly" 
                                    onClick={() => handleInitialSearch('beginner', quickActionDate, 1, userCoordinates || undefined, "Any")} 
                                />
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Main content wrapper (LLM recommendations and course list) only appears after a search */}
                              {(hasSearched || loadingCourses) && (
                    <div className={styles['main-content-wrapper']}>
                        {loadingCourses && aiRecommendedCourses.length === 0 && allFetchedCourses.length === 0 ? (
                            <div className={styles['loading-content']}>
                                <div className={styles['loading-spinner']}></div>
                                <p className={styles['loading-message']}>Finding perfect courses for you...</p>
                            </div>
                        ) : (
                                <>
                                    {topPick && explanation && (
                                        <div className={styles['llm-recommendation']}> 
                                            <h2>
                                                <Bot size={20} className={styles['llm-icon']} /> Birdie's Top Pick: {topPick}
                                            </h2>
                                            <p>"{explanation}"</p>
                                        </div>
                                    )}

                                    {coursesToDisplay.length > 0 ? (
                                        <CourseList courses={coursesToDisplay} topPickName={topPick} /> 
                                    ) : (
                                        // Only show "No courses found" if not loading and no results, and a search HAS been performed
                                        !loadingCourses && hasSearched && <p className={styles['no-results-message']}>No courses found. Try a different search!</p>
                                    )}

                                    {/* Buttons for Clear Search and Load More */}
                                    {(aiRecommendedCourses.length > 0 || allFetchedCourses.length > 0 || topPick) && ( 
                                        <div className={styles['action-buttons-container']}>
                                            <button 
                                                onClick={handleClearSearch} 
                                                className={styles['clear-search-button']}
                                                disabled={loadingCourses}
                                            >
                                                Clear Search
                                            </button>

                                            {showToggleAllCoursesButton && (
                                                <button 
                                                    onClick={() => setShowAllCoursesView(prev => !prev)}
                                                    className={styles['load-more-button']}
                                                    disabled={loadingCourses}
                                                >
                                                    {showAllCoursesView ? 'Show AI Picks' : 'Show All Options'}
                                                </button>
                                            )}

                                            {hasMorePages && !showAllCoursesView && ( 
                                                <button 
                                                    onClick={handleLoadMorePages} 
                                                    className={styles['load-more-button']}
                                                    disabled={loadingCourses}
                                                >
                                                    {loadingCourses ? 'Loading More...' : 'Load Next Page'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div> 
                    )}
                </>
            )}

            {/* Floating Chat Button */}
            <button 
                className={styles['chat-fab']} 
                onClick={() => setIsChatOpen(true)}
                title="Chat with AI Assistant"
            >
                <MessageSquare size={24} />
            </button>

            {/* Chatbot Component */}
            <Chatbot 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
                initialMessage={chatInitialMessage} 
            />
        </div>
    );
}