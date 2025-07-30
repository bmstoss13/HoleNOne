import React from 'react';
import { CourseCard } from './CourseCard';

export default function CourseList({ courses }: { courses: any[] }) {
    if (!courses || courses.length === 0) return null;

    return (
        <div className="results-container">
            {courses.map((course, index) => (
                <CourseCard key={index} course={course} />
            ))}
        </div>
    );
}
