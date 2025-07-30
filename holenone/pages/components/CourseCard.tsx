// components/CourseCard.tsx (or wherever your CourseCard is defined)

import Link from "next/link";
// Make sure this path is correct for your shared types
import { Course } from "@/types/golf"; // Ensure this imports your updated Course interface

interface CourseCardProps { // Renamed from 'Props' to be more specific
    course: Course; // Use the imported Course interface
}

// Helper function to format priceLevel
const formatPriceLevel = (priceLevel?: number): string => {
    if (priceLevel === undefined || priceLevel === null) {
        return 'N/A'; // Or whatever you prefer for missing price info
    }
    switch (priceLevel) {
        case 0: return 'Free';
        case 1: return '$';
        case 2: return '$$';
        case 3: return '$$$';
        case 4: return '$$$$';
        default: return 'N/A'; // For any unexpected value
    }
};

export const CourseCard = ({ course }: CourseCardProps) => ( // Use the new interface name
    <div className="course-card">
        {course.image && <img src={course.image} alt={`${course.name} image`} />}
        <h3>{course.name}</h3>
        {/* Use optional chaining and nullish coalescing for rating */}
        <p>Rating: {course.rating?.toFixed(1) ?? "N/A"}</p>
        {/* Use optional chaining for distance */}
        <p>Distance: {course.distance?.toFixed(1)} miles</p>
        {/* Use the new formatPriceLevel function */}
        <p>Price: {formatPriceLevel(course.priceLevel)}</p>

        {/* ... (Book Button fix will go here) ... */}
        {course.website ? ( // Check if website exists before rendering the link
            <a href={course.website} target="_blank" rel="noopener noreferrer">
                Book Now
            </a>
        ) : (
            // Optional: Display a message if no website is available
            <p className="no-website-msg">Website not available</p>
        )}
    </div>
);