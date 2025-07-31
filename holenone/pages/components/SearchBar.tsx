import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Users, Calendar, Clock, AlertCircle } from 'lucide-react';
import { CustomCoordinates, getUserLocation } from '../../lib/golfApi';
import '../styling/index.module.css';

interface SearchBarProps {
    onSearch: (query: string, date: string, players: number, locationCoords: CustomCoordinates, timeOfDay?: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [players, setPlayers] = useState(1);
    const [locationInput, setLocationInput] = useState(""); 
    const [autoCoords, setAutoCoords] = useState<CustomCoordinates | undefined>(undefined); 
    const [timeOfDay, setTimeOfDay] = useState("Any");
    const [isGeocoding, setIsGeocoding] = useState(false); 
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const hasUserEditedLocation = useRef(false);

    // Geocoding function - now properly included in the component
    const geocodeAddress = async (address: string): Promise<CustomCoordinates | null> => {
        setIsGeocoding(true);
        try {
            const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Geocoding API error: ${errorText}`);
                return null;
            }
            return await response.json();
        } catch (err) {
            console.error('Geocoding request failed:', err);
            return null;
        } finally {
            setIsGeocoding(false);
        }
    };

    // Location input handler - now properly included
    const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLocation = e.target.value;
        setLocationInput(newLocation);
        hasUserEditedLocation.current = true;
        clearValidation('location');
    };

    // Validation functions
    const validateFields = () => {
        const errors: Record<string, string> = {};
        
        if (!query.trim()) errors.query = "Please describe what you're looking for";
        if (!date) errors.date = "Please select a date";
        if (players < 1 || players > 16) errors.players = "Please select 1-16 players";
        if (!locationInput.trim()) errors.location = "Please enter or allow location access";
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const clearValidation = (field: string) => {
        setValidationErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[field];
            return newErrors;
        });
    };

    // Initial location fetch - unchanged from your original
    useEffect(() => {
        const fetchAndSetLocation = async () => {
            try {
                const coords = await getUserLocation(); 
                setAutoCoords(coords); 

                if (!hasUserEditedLocation.current) {
                    const response = await fetch(`/api/reverseGeocode?lat=${coords.lat}&lng=${coords.lng}`);
                    const data = await response.json();
                    setLocationInput(data.address || `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)} (Approx)`);
                }
            } catch (err) {
                console.error("Location fetch error:", err);
                if (!hasUserEditedLocation.current) {
                    setLocationInput("Unable to get location");
                }
            }
        };

        fetchAndSetLocation();
    }, []);

    // Search handler - now properly using the included functions
    const handleSearchClick = async () => {
        if (!validateFields()) return;

        let finalCoords: CustomCoordinates | null | undefined; 

        if (locationInput.trim() !== "") {
            finalCoords = await geocodeAddress(locationInput);
            if (!finalCoords) {
                setValidationErrors(prev => ({
                    ...prev,
                    location: "Could not find this location"
                }));
                return; 
            }
        } else {
            finalCoords = autoCoords;
        }

        if (!finalCoords) {
            setValidationErrors(prev => ({
                ...prev,
                location: "A valid location is required"
            }));
            return;
        }

        onSearch(query, date, players, finalCoords, timeOfDay);
    };

    // ... (keep all your existing helper functions like geocodeAddress and useEffect hooks)

    return (
        <div className="search-bar">
            {/* Main Search Query Input */}
            <div className={`input-with-icon main-query-input ${validationErrors.query ? 'has-error' : ''}`}>
                <Search size={20} className="input-icon" />
                <input
                    type="text"
                    placeholder="Describe your next hole in one..."
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        clearValidation('query');
                    }}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearchClick(); }}
                />
                {validationErrors.query && (
                    <div className="validation-error">
                        <AlertCircle size={16} className="error-icon" />
                        <span>{validationErrors.query}</span>
                    </div>
                )}
            </div>

            {/* Date Input */}
            <div className={`input-with-icon date-input ${validationErrors.date ? 'has-error' : ''}`}>
                <Calendar size={20} className="input-icon" />
                <input 
                    type="date" 
                    value={date} 
                    onChange={e => {
                        setDate(e.target.value);
                        clearValidation('date');
                    }} 
                />
                {validationErrors.date && (
                    <div className="validation-error">
                        <AlertCircle size={16} className="error-icon" />
                        <span>{validationErrors.date}</span>
                    </div>
                )}
            </div>

            {/* Players Input */}
            <div className={`players-input ${validationErrors.players ? 'has-error' : ''}`}>
                <button onClick={() => {
                    setPlayers(p => Math.max(1, p - 1));
                    clearValidation('players');
                }}>–</button>
                <span><Users size={16} /> {players}</span>
                <button onClick={() => {
                    setPlayers(p => Math.min(16, p + 1));
                    clearValidation('players');
                }}>+</button>
                {validationErrors.players && (
                    <div className="validation-error">
                        <AlertCircle size={16} className="error-icon" />
                        <span>{validationErrors.players}</span>
                    </div>
                )}
            </div>

            {/* Location Input */}
            <div className={`input-with-icon location-input ${validationErrors.location ? 'has-error' : ''}`}>
                <MapPin size={20} className="input-icon" />
                <input
                    type="text"
                    placeholder="Enter city, state"
                    value={locationInput} 
                    onChange={e => {
                        handleLocationInputChange(e);
                        clearValidation('location');
                    }}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearchClick(); }}
                />
                {validationErrors.location && (
                    <div className="validation-error">
                        <AlertCircle size={16} className="error-icon" />
                        <span>{validationErrors.location}</span>
                    </div>
                )}
            </div>

            {/* Time of Day Dropdown */}
            <div className="input-with-icon time-dropdown">
                <Clock size={20} className="input-icon" />
                <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}>
                    <option value="Any">Any time</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                </select>
            </div>

            {/* Search Button */}
            <button onClick={handleSearchClick} disabled={isGeocoding}>
                {isGeocoding ? 'Locating...' : 'Search'}
            </button>
        </div>
    );
}