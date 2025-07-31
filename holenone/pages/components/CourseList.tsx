// components/CourseList.tsx

import React from 'react';
import CourseCard from './CourseCard'; // Assuming CourseCard is in the same directory
import { Course } from '@/types/golf'; // Import Course interface from your types
import '../styling/index.module.css';

interface CourseListProps {
    courses: Course[]; // This is the prop that might be undefined
    topPickName: string | null; // New prop to receive the name of the top pick
}

const CourseList: React.FC<CourseListProps> = ({ courses, topPickName }) => {
    // Add a defensive check: if courses is null or undefined, default to an empty array
    // This prevents the .map() error during initial render or if data is not yet available.
    if (!courses || !Array.isArray(courses)) {
        console.warn("CourseList received an invalid or empty 'courses' prop. Rendering empty list.");
        return (
            <div className="results-container">
                {/* Optionally, you can render a placeholder or message here */}
                {/* <p>No courses to display.</p> */}
            </div>
        );
    }

    return (
        <div className="results-container"> {/* This class is styled in index.module.css */}
            {courses.map(course => (
                <CourseCard 
                    key={course.id} 
                    course={course} 
                    isTopPick={course.name === topPickName} // Pass true if this course is the top pick
                />
            ))}
        </div>
    );
};

export default CourseList;
