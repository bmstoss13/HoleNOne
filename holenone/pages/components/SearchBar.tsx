import { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons';

// Make sure CustomCoordinates is consistently defined and ideally imported from a shared file (e.g., types/common.ts or lib/golfApi.ts)
// For this example, I'll keep it here, but best practice is to centralize interfaces.
interface CustomCoordinates {
    lat: number;
    lng: number;
}

interface SearchBarProps {
    onSearch: (query: string, date: string, players: number, location?: CustomCoordinates) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const [text, setText] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [players, setPlayers] = useState(1);

    const handleSearchClick = () => {
        // Attempt to get geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    // Success: Transform GeolocationCoordinates to CustomCoordinates
                    const customCoords: CustomCoordinates = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    onSearch(text, date, players, customCoords);
                },
                error => {
                    // Failure: Log warning and fallback to searching without location
                    console.warn("Geolocation failed:", error);
                    alert("Unable to get your current location. Please manually enter a location if needed.");
                    onSearch(text, date, players); // Fallback without location
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            // Geolocation not supported by browser
            console.warn("Geolocation is not supported by this browser.");
            alert("Your browser does not support geolocation. Please manually enter a location if needed.");
            onSearch(text, date, players); // Fallback without location
        }
    };

    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder="Describe your ideal round..."
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div className="players-input">
                <button onClick={() => setPlayers(p => Math.max(1, p - 1))}>–</button>
                <span><FontAwesomeIcon icon={faPeopleGroup} />{players}</span>
                <button onClick={() => setPlayers(p => Math.min(16, p + 1))}>+</button>
            </div>
            <button onClick={handleSearchClick}> {/* Use the new handler */}
                Search
            </button>
        </div>
    );
}
