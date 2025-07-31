// components/CourseList.tsx

import React from 'react';
import { CourseCard } from './CourseCard'; // Assuming CourseCard is in the same directory
import { Course } from '@/types/golf'; // Import Course interface from your types

interface CourseListProps {
    courses: Course[];
    topPickName: string | null; // New prop to receive the name of the top pick
}

const CourseList: React.FC<CourseListProps> = ({ courses, topPickName }) => {
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