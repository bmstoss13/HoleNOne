import { getFromCache, setCache } from "@/lib/cache";
import { resolveFacilityId, fetchTeeTimes } from "@/lib/golfScraper";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { courseName, date } = req.query;

    if (!courseName || typeof courseName !== "string") {
        return res.status(400).json({ error: "Missing courseName" });
    }

    const resolvedId = await resolveFacilityId(courseName);
    if (!resolvedId) {
        return res.status(404).json({ error: "Course not found on GolfNow" });
    }

    const teeTimes = await fetchTeeTimes(resolvedId, date as string || new Date().toISOString().split("T")[0]);
    return res.status(200).json({ courseName, facilityId: resolvedId, teeTimes });
}