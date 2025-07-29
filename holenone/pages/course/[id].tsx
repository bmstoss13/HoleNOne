// pages/course/[id].tsx (simplified for tee time search)
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
// Assuming you have a type for Course and TeeTime
import type { Course, TeeTime } from '../../types/golf'; // Define these types

interface LLMResponse {
    teeTimes: TeeTime[];
    observation: any; // The last page observation for chaining
    status: string; // Message from the AI (e.g., "Analyzing page...", "Tee times found.")
    thought: string; // LLM's internal thought process for debugging
    message?: string;
    redirectUrl?: string;
}

export default function CourseDetail() {
    const router = useRouter();
    const { id } = router.query;
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(false);
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchDate, setSearchDate] = useState('');
    const [numPlayers, setNumPlayers] = useState(2);
    const [conversationHistory, setConversationHistory] = useState<any[]>([]);
    const [lastObservation, setLastObservation] = useState<any>(null); // To maintain state
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [bookingStatus, setBookingStatus] = useState<string | null>(null);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    const handleBookTeeTime = async (teeTime: TeeTime) => {
        if (!course || !userName || !userEmail || !userPhone) {
            setBookingStatus('Please provide your name, email, and phone number to book.');
            return;
        }

        setLoading(true);
        setBookingStatus('Initiating booking...');
        setError(null);

        try {
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId: course.id,
                    teeTime: teeTime,
                    userDetails: { name: userName, email: userEmail, phone: userPhone },
                    sessionId: sessionId,
                    currentObservation: lastObservation, // Pass the current state of the browser
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setBookingStatus(`Booking successful! Confirmation URL: ${data.confirmationUrl || 'N/A'}`);
                router.push(`/confirmation?course=${course.name}&time=${teeTime.time}&date=${searchDate}`); // Redirect to confirmation
            } else {
                setBookingStatus(`Booking failed: ${data.message || 'Unknown error.'}`);
                setError(`Booking failed: ${data.message || 'Unknown error.'}`);
            }
        } catch (err) {
            console.error('Booking API call error:', err);
            setBookingStatus('An unexpected error occurred during booking.');
            setError('An unexpected error occurred during booking.');
        } finally {
            setLoading(false);
        }
    };

    // Add input fields in your JSX for user details:
    /*
        <h2>Your Details for Booking</h2>
        <div>
            <label htmlFor="userName">Name:</label>
            <input type="text" id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} />
        </div>
        <div>
            <label htmlFor="userEmail">Email:</label>
            <input type="email" id="userEmail" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
        </div>
        <div>
            <label htmlFor="userPhone">Phone:</label>
            <input type="tel" id="userPhone" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} />
        </div>
        {bookingStatus && <p>{bookingStatus}</p>}
    */

    useEffect(() => {
        const fetchCourse = async () => {
            if (id) {
                setLoading(true);
                setError(null);
                try {
                // *** CORRECTED LINE HERE ***
                    const response = await fetch(`/api/course/${id}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to fetch course details.');
                    }
                    const fetchedCourse: Course = await response.json();
                    setCourse(fetchedCourse);
                    if (!fetchedCourse) {
                        setError(`Course with ID ${id} not found.`);
                    }
                } catch (err) {
                    console.error('Failed to fetch course details:', err);
                    setError('Failed to load course details. Please try again.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchCourse();
    }, [id]);

    const sessionId = "user_session_abc"; // Generate a unique session ID per user/tab

    const handleFindTeeTimes = async () => {
        setLoading(true);
        setError(null);
        setTeeTimes([]);
        setConversationHistory([]);
        setRedirectUrl(null); // Clear redirect URL on new search

        if (!course || !searchDate || !numPlayers) {
        setError('Please select a course, date, and number of players.');
        setLoading(false);
        return;
        }

        try {
        const response = await fetch('/api/tee-times', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            sessionId,
            courseId: course.id,
            date: searchDate,
            numPlayers,
            currentObservation: lastObservation, // Pass the last observation
            }),
        });

        const data: LLMResponse = await response.json(); // Use the updated LLMResponse type

        if (response.ok) {
            setTeeTimes(data.teeTimes || []);
            setLastObservation(data.observation);
            // Add LLM's status/thought to history
            setConversationHistory(prev => [...prev, { role: 'ai', message: data.status, thought: data.thought }]);

            // NEW: Handle redirect URL
            if (data.redirectUrl) {
            setRedirectUrl(data.redirectUrl);
            setError(`AI got stuck. You may need to manually complete the process. Click the link to continue: ${data.redirectUrl}`);
            } else if (data.teeTimes && data.teeTimes.length === 0) {
            // No tee times found, but not a redirect case
            setError(data.message || 'No tee times found for the selected criteria.');
            } else {
                // Success case, tee times found
                setError(null); // Clear any previous errors
            }

        } else {
            // Error from API route
            setError(data.message || 'Failed to retrieve tee times.');
            setConversationHistory(prev => [...prev, { role: 'ai', message: `Error: ${data.message || 'Failed to retrieve tee times.'}` }]);
            // NEW: Handle redirect URL in case of API error
            if (data.redirectUrl) {
                setRedirectUrl(data.redirectUrl);
            }
        }
        } catch (err) {
        console.error('Error fetching tee times:', err);
        setError('An unexpected error occurred while fetching tee times.');
        setConversationHistory(prev => [...prev, { role: 'ai', message: `Unexpected error: ${(err as Error).message}` }]);
        } finally {
        setLoading(false);
        }
    };

    if (!course) return <div>Loading course details...</div>;

    return (
        <div>
        <h1>{course.name}</h1>
        <p>Website: <a href={course.website} target="_blank" rel="noopener noreferrer">{course.website}</a></p>

        <h2>Find Tee Times</h2>
        <div>
            <label htmlFor="searchDate">Date:</label>
            <input
            type="date"
            id="searchDate"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            />
        </div>
        <div>
            <label htmlFor="numPlayers">Number of Players:</label>
            <input
            type="number"
            id="numPlayers"
            value={numPlayers}
            onChange={(e) => setNumPlayers(parseInt(e.target.value))}
            min="1"
            max="4" // Adjust as needed
            />
        </div>
        <button onClick={handleFindTeeTimes} disabled={loading}>
            {loading ? 'Searching...' : 'Find Tee Times'}
        </button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {redirectUrl && (
            <p style={{ marginTop: '15px' }}>
                <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                    Continue Manually Here
                </a>
            </p>
        )}

        {teeTimes.length > 0 && (
            <div>
            <h3>Available Tee Times:</h3>
            <ul>
                {teeTimes.map((time, index) => (
                <li key={index}>
                    {time.time} {time.price && `- ${time.price}`} {time.availableSlots && `(${time.availableSlots} slots)`}
                    {/* Add a button to "Book this time" which will trigger the booking flow */}
                    <button onClick={() => handleBookTeeTime(time)}>Book Now</button>
                </li>
                ))}
            </ul>
            </div>
        )}

        <h3>AI Chat Log:</h3>
        <div style={{ border: '1px solid #ccc', padding: '10px', height: '200px', overflowY: 'scroll' }}>
            {conversationHistory.map((entry, index) => (
            <div key={index}>
                <strong>{entry.role}:</strong> {entry.message}
                {entry.thought && <span style={{ fontSize: '0.8em', color: '#666' }}> (Thought: {entry.thought})</span>}
            </div>
            ))}
        </div>
        </div>
    );
}