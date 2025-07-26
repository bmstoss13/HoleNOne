import type { NextApiRequest, NextApiResponse } from "next";
import { getNearbyCourses } from "../../lib/golfApi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { lat, lng } = req.query;

    // Check if latitude and longitude exist and are given.
    if(!lat || !lng){
        return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    try{
        //Fetch nearby courses (within 100 kilometers)
        const courses = await getNearbyCourses(Number(lat), Number(lng));
        res.status(200).json({ courses });
    } catch(error){
        console.error("Error fetching courses: " + error);
    }
}
