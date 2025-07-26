import type { NextApiRequest, NextApiResponse } from 'next';
import { getTeeTimes } from '../../lib/golfApi';

// Handler for getting tee times
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { courseId, date } = req.query;

    if (!courseId || !date) {
        return res.status(400).json({ error: 'courseId and date are required' });
    }
    try{
        //fetch tee times
        const times = await getTeeTimes(courseId.toString(), date.toString());
        res.status(200).json({ times });
    } catch(error){
        res.status(500).json({ error: "Error fetching tee times"});
    }
}
