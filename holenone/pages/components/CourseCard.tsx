// components/CourseCard.tsx
import React from "react";
import Link from "next/link"; 
import { Course } from "@/types/golf"; 
import '../styling/index.module.css';

interface CourseCardProps {
    course: Course; // This is the prop that might be undefined
    isTopPick?: boolean; // New optional prop to indicate if it's the top pick
}

// Helper function to format priceLevel
const formatPriceLevel = (priceLevel?: number): string => {
    if (priceLevel === undefined || priceLevel === null) {
        return '$$';
    }
    switch (priceLevel) {
        case 0: return 'Free';
        case 1: return '$';
        case 2: return '$$';
        case 3: return '$$$';
        case 4: return '$$$$';
        default: return '$$'; // Changed default to N/A for consistency
    }
};

// Changed to default export
const CourseCard = ({ course, isTopPick }: CourseCardProps) => {
    // Add a defensive check for the 'course' prop
    if (!course) {
        console.warn("CourseCard received an undefined or null course prop. Skipping render.");
        return null; // Return null to render nothing if course is undefined/null
    }

    return (
        // Conditionally add the 'is-top-pick' class based on the prop
        <div className={`course-card ${isTopPick ? 'is-top-pick' : ''}`}> 
            {/* Image tag with fixed size styling applied via CSS and an onError fallback */}
            {course.image ? (
                <img 
                    src={course.image} 
                    alt={`${course.name} image`} 
                    // Fallback to a placeholder image if the actual image fails to load
                    onError={(e) => { 
                        e.currentTarget.src = `https://placehold.co/400x200/cccccc/000000?text=${encodeURIComponent(course.name)}`; 
                        e.currentTarget.onerror = null; // Prevent infinite loop if placeholder also fails
                    }}
                />
            ) : (
                // Display a generic placeholder if no image URL is provided
                <img 
                    src={`https://placehold.co/400x200/cccccc/000000?text=${encodeURIComponent(course.name)}+Image`} 
                    alt={`${course.name} placeholder image`} 
                />
            )}
            
            <h3>{course.name}</h3>
            <p>Rating: {course.rating?.toFixed(1) ?? "N/A"}</p>
            <p>Distance: {course.distance?.toFixed(1)} miles</p>
            <p>Price Level: {formatPriceLevel(course.priceLevel)}</p>

            {course.website ? (
                <button 
                    onClick={() => window.open(course.website, '_blank', 'noopener noreferrer')}
                    className="book-now-button" 
                >
                    Book Now
                </button>
            ) : (
                <p className="no-website-msg">Website not available</p>
            )}
        </div>
    );
};

export default CourseCard; // Export as default
