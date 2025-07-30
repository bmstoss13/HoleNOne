import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPeopleGroup, faSearch, faClock, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

interface CustomCoordinates {
    lat: number;
    lng: number;
}

interface SearchBarProps {
    onSearch: (query: string, date: string, players: number, location?: CustomCoordinates, timeOfDay?: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const [text, setText] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [players, setPlayers] = useState(1);
    const [locationInput, setLocationInput] = useState(""); // User-entered location string
    const [autoCoords, setAutoCoords] = useState<CustomCoordinates | undefined>(undefined); // Coordinates from browser's geolocation
    // We no longer need 'manualCoords' as a separate state,
    // we'll get it directly in handleSearchClick if needed.

    const [timeOfDay, setTimeOfDay] = useState("Any");
    const [isGeocoding, setIsGeocoding] = useState(false); // To prevent multiple rapid geocoding calls

    // Ref to track if location input was manually changed by user
    const hasUserEditedLocation = useRef(false);

    // --- Helper for Geocoding via Backend ---
    const geocodeAddress = async (address: string): Promise<CustomCoordinates | null> => {
        setIsGeocoding(true);
        try {
            const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
            if (!response.ok) {
                // Read the response as text for better debugging if it's not JSON
                const errorText = await response.text();
                console.error(`Backend geocoding API error (Status: ${response.status}):`, errorText);
                return null;
            }
            const data: CustomCoordinates = await response.json();
            return data;
        } catch (err) {
            console.error('Frontend geocoding request error:', err);
            return null;
        } finally {
            setIsGeocoding(false);
        }
    };

    // --- EFFECT HOOK: Get initial user location and reverse geocode ---
    useEffect(() => {
        // Only run once on mount, and only if user hasn't already typed a location
        // The dependency array is empty, so it only runs on initial render.
        if (!hasUserEditedLocation.current && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async position => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const customCoords: CustomCoordinates = { lat, lng };
                    setAutoCoords(customCoords); // Store device coords

                    // Reverse geocode using Nominatim for display in the input field
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const data = await res.json();
                        const city = data.address.city || data.address.town || data.address.village || "";
                        const state = data.address.state || "";
                        if (city || state) {
                            setLocationInput(`${city}${city && state ? ', ' : ''}${state}`);
                        }
                    } catch (err) {
                        console.warn("Failed to reverse geocode initial location for display:", err);
                    }
                },
                err => {
                    console.warn("Geolocation error:", err);
                    // Optionally set a default location or show a message to the user
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
    }, []); // Empty dependency array means this runs once on mount


    // --- Handle Manual Location Input Change (ONLY updates state, no geocoding here) ---
    const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLocation = e.target.value;
        setLocationInput(newLocation);
        hasUserEditedLocation.current = true; // Mark that user has interacted
        // No geocoding call here!
    };


    const handleSearchClick = async () => {
        let finalCoords: CustomCoordinates | undefined;

        // If the user has typed something in the location input
        if (locationInput.trim() !== "") {
            // Geocode the typed location when search is clicked
            const geocodedResult = await geocodeAddress(locationInput);
            if (geocodedResult) {
                finalCoords = geocodedResult;
            } else {
                console.warn("Could not geocode user-entered location. Proceeding without location data.");
                finalCoords = undefined; // Ensure no invalid coords are sent
            }
        } else {
            // If the location input is empty, use the automatically detected coordinates
            finalCoords = autoCoords;
        }

        onSearch(text, date, players, finalCoords, timeOfDay);
    };

    return (
        <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} />
            <input
                type="text"
                placeholder="Search for your next hole in one..."
                value={text}
                onChange={e => setText(e.target.value)}
            />

            <input type="date" value={date} onChange={e => setDate(e.target.value)} />

            <div className="players-input">
                <button onClick={() => setPlayers(p => Math.max(1, p - 1))}>–</button>
                <span><FontAwesomeIcon icon={faPeopleGroup} /> {players}</span>
                <button onClick={() => setPlayers(p => Math.min(16, p + 1))}>+</button>
            </div>

            <div className="location-input">
                <FontAwesomeIcon icon={faMapMarkerAlt} />
                <input
                    type="text"
                    placeholder="Enter city, state"
                    value={locationInput} // Still uses locationInput state
                    onChange={handleLocationInputChange} // New handler (no geocoding here)
                />
            </div>

            <div className="time-dropdown">
                <FontAwesomeIcon icon={faClock} />
                <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}>
                    <option value="Any">Any time</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                </select>
            </div>

            <button onClick={handleSearchClick}>Search</button>
        </div>
    );
}