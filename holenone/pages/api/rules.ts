// pages/api/rules.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getBookingRules } from '../../lib/golfApi';

//Handler for getting booking rules
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { courseId } = req.query;

    if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' });
    }
    try{
        //Fetch booking rules
        const rules = await getBookingRules(courseId.toString());
        res.status(200).json({ rules });
    } catch(error){
        res.status(500).json({ error: "Error fetching booking rules" });
    }
}
