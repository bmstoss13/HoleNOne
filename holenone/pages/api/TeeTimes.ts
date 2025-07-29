import { NextApiRequest, NextApiResponse } from 'next';
import { WebAgent } from '@/lib/webAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date = 'Jul+30+2025', numPlayers=2 } = req.query;

  try {
    const agent = new WebAgent();
    const teeTimes = await agent.findTeeTimes(date.toString(), Number(numPlayers));
    res.status(200).json({ teeTimes });
  } catch (error) {
    console.error('Error fetching tee times:', error);
    res.status(500).json({ error: 'Failed to fetch tee times' });
  }
}
