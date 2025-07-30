// pages/api/courses.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getNearbyCourses } from "../../lib/golfApi"; // Make sure getNearbyCourses is correctly imported

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let lat: string | number | undefined; // Adjust type to allow for number directly from body
    let lng: string | number | undefined; // Adjust type to allow for number directly from body

    // Determine where to get lat/lng based on the request method
    if (req.method === 'POST') {
        // For POST requests, the data is in the request body
        ({ lat, lng } = req.body);
    } else if (req.method === 'GET') {
        // If you ever send GET requests (e.g., /api/courses?lat=X&lng=Y)
        // You'd read from req.query and convert to number
        lat = req.query.lat ? Number(req.query.lat) : undefined;
        lng = req.query.lng ? Number(req.query.lng) : undefined;
    } else {
        // Method not allowed for any other HTTP verb
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Ensure lat and lng are actual numbers
    const numLat = typeof lat === 'string' ? parseFloat(lat) : lat;
    const numLng = typeof lng === 'string' ? parseFloat(lng) : lng;

    // Check if latitude and longitude exist and are valid numbers
    if (typeof numLat !== 'number' || typeof numLng !== 'number' || isNaN(numLat) || isNaN(numLng)) {
        return res.status(400).json({ error: "Valid latitude and longitude are required." });
    }

    try {
        // Fetch nearby courses (within 100 kilometers)
        // Ensure getNearbyCourses expects numbers directly
        const courses = await getNearbyCourses(numLat, numLng);
        res.status(200).json({ courses });
    } catch (error: any) {
        console.error("Error in /api/courses:", error); // Log the actual error for debugging
        res.status(500).json({ error: "Error fetching golf courses", details: error.message || "Unknown error" });
    }
}
