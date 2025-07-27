// pages/api/course/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCourseDetails } from '../../../lib/golfApi'; // Import the function from your lib

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query; // Get the course ID from the URL

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Course ID is required.' });
  }

  try {
    const course = await getCourseDetails(id); // Call your server-side function
    if (course) {
      res.status(200).json(course);
    } else {
      res.status(404).json({ message: `Course with ID ${id} not found.` });
    }
  } catch (error) {
    console.error(`Error fetching course details for ${id}:`, error);
    res.status(500).json({ message: 'Internal server error while fetching course details.' });
  }
}