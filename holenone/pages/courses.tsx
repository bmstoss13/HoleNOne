import { useEffect, useState } from 'react';

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

    const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by this browser."));
                return; // Important: exit after rejecting
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
                    enableHighAccuracy: true, // Request the best possible results
                    timeout: 10000,          // Wait up to 10 seconds for a position
                    maximumAge: 0            // Do not use a cached position
                }
            );
        });
    };

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true); // Initial loading state
    const [error, setError] = useState<string | null>(null); // State for errors

    useEffect(() => {
        const fetchLocationAndCourses = async () => {
            setLoading(true); // Start loading
            setError(null); // Clear previous errors

            try {
                // 1. Get user's current location
                const coords = await getUserLocation();
                setUserLocation(coords);

                // 2. Use user's location to fetch courses
                const response = await fetch(`/api/courses?lat=${coords.lat}&lng=${coords.lng}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch courses.');
                }

                const data: ApiResponse = await response.json();
                setCourses(data.courses);

            } catch (err: any) {
                console.error("Error fetching location or courses:", err);
                setError(err.message || "An unexpected error occurred while loading courses.");
            } finally {
                setLoading(false); // End loading, regardless of success or failure
            }
        };

        fetchLocationAndCourses();
    }, []); // Empty dependency array means this runs once on component mount

    if (loading) {
        return <div>Loading nearby golf courses and your location...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>Error: {error}</div>;
    }

    if (!userLocation) {
        // This case might be hit if error occurs, but also useful if loading is false but no location found (e.g. permission denied handled)
        return <div>Could not retrieve your location. Please ensure location services are enabled and permissions granted.</div>;
    }



    return (
        <div>
            <h1>Nearby Golf Courses</h1>
            {courses.length === 0 && !loading && !error && (
                <p>No golf courses found near your location.</p>
            )}
            {courses.map(course => (
                <div key={course.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
                    <h3>{course.name}</h3>
                    <p>Location: Lat {course.location.lat.toFixed(4)}, Lng {course.location.lng.toFixed(4)}</p>
                    <p>City: {course.city}, State: {course.state}</p>
                    <a href={`/course/${course.id}`}>View Tee Times</a>
                </div>
            ))}
        </div>
    );
}