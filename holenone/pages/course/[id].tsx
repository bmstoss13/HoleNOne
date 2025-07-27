// pages/course/[id].tsx (simplified for tee time search)
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
// Assuming you have a type for Course and TeeTime
import type { Course, TeeTime } from '../../types/golf'; // Define these types
import { getCourseDetails } from '../../lib/golfApi'

interface LLMResponse {
    teeTimes: TeeTime[];
    observation: any; // The last page observation for chaining
    status: string; // Message from the AI (e.g., "Analyzing page...", "Tee times found.")
    thought: string; // LLM's internal thought process for debugging
    message?: string;
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
        if (!course || !searchDate || !numPlayers) {
        setError('Please select a date and number of players.');
        return;
        }

        setLoading(true);
        setError(null);
        setTeeTimes([]);
        setConversationHistory(prev => [...prev, { role: 'user', message: `Find tee times for ${numPlayers} players on ${searchDate}.` }]);

        try {
        const response = await fetch('/api/tee-times', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            courseId: course.id,
            date: searchDate,
            numPlayers: numPlayers,
            sessionId: sessionId,
            userMessage: `Find tee times for ${numPlayers} players on ${searchDate}.`,
            lastObservation: lastObservation, // Pass the observation for chained calls
            }),
        });

        const data: LLMResponse = await response.json();
        setLastObservation(data.observation); // Save for next interaction

        if (response.ok) {
            setTeeTimes(data.teeTimes);
            setConversationHistory(prev => [...prev, { role: 'ai', message: data.status, thought: data.thought }]);
            if (data.teeTimes.length === 0) {
            setError('No tee times found for the selected criteria. AI status: ' + data.status);
            }
        } else {
            setError(data.message || 'Failed to retrieve tee times.');
            setConversationHistory(prev => [...prev, { role: 'ai', message: `Error: ${data.message || 'Failed to retrieve tee times.'}` }]);
        }
        } catch (err) {
        console.error('API call error:', err);
        setError('An unexpected error occurred.');
        setConversationHistory(prev => [...prev, { role: 'ai', message: `Error: An unexpected error occurred. ${(err as Error).message}` }]);
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