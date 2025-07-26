import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

import { parse } from "node-html-parser";

export interface TeeTime {
    time: string;
    price: string;
    playersAvailable: number;
    bookingUrl: string;
}

const facilityCache = new Map<string, string>();

// Step 1: Resolve Facility ID
export async function resolveFacilityId(courseName: string): Promise<string | null> {
    if (facilityCache.has(courseName)) return facilityCache.get(courseName)!;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const searchUrl = `https://www.golfnow.com/search-results?search=${encodeURIComponent(courseName)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

    const content = await page.content();
    const root = parse(content);

    const anchor = root.querySelector("a[href*='/tee-times/facility/']");
    if (!anchor) {
        await browser.close();
        return null;
    }

    const match = anchor.getAttribute("href")?.match(/\/facility\/(\d+)-/);
    await browser.close();

    if (match) {
        facilityCache.set(courseName, match[1]);
        return match[1];
    }

    return null;
}

// Step 2: Scrape tee times for a given facility and date
export async function fetchTeeTimes(facilityId: string, date: string): Promise<TeeTime[]> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const golfNowUrl = `https://www.golfnow.com/tee-times/facility/${facilityId}/search#date=${date}`;
    await page.goto(golfNowUrl, { waitUntil: "domcontentloaded" });

    const content = await page.content();
    const root = parse(content);
    const teeTimeElements = root.querySelectorAll(".TeeTimeSearch-results-item");

    const teeTimes: TeeTime[] = teeTimeElements.map(el => {
        const time = el.querySelector(".time-display")?.text || "N/A";
        const price = el.querySelector(".price")?.text || "N/A";
        const players = parseInt(el.querySelector(".player-count")?.text || "0");
        const bookingUrl = `https://www.golfnow.com${el.querySelector("a")?.getAttribute("href")}`;

        return { time, price, playersAvailable: players, bookingUrl };
    });

    await browser.close();
    return teeTimes;
}