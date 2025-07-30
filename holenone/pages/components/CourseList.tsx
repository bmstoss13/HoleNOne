import React from 'react';
import CourseCard from './CourseCard';

export default function CourseList({ courses }: { courses: any[] }) {
    if (!courses || courses.length === 0) return null;

    return (
        <div style={{ marginTop: '2rem' }}>
            {courses.map((course, index) => (
                <CourseCard key={index} course={course} />
            ))}
        </div>
    );
}
