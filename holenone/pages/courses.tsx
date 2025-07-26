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

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);

    useEffect(() => {
        fetch("/api/courses?lat=28.5&lng=-81.4")
            .then(res => res.json())
            .then((data: ApiResponse) => setCourses(data.courses));
    }, []);

    return (
        <div>
            <h1>Nearby Golf Courses</h1>
            {courses.map(course => (
                <div key={course.id}>
                    <h3>{course.name}</h3>
                    <p>{course.location.lat}</p>
                    <a href={`/course/${course.id}`}>View Tee Times</a>
                </div>
            ))}
        </div>
    );
}