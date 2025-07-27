import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
puppeteer.use(StealthPlugin());

import { parse } from "node-html-parser";

export interface TeeTime {
    time: string;
    price: string;
    playersAvailable: number;
    bookingUrl: string;
}

const facilityCache = new Map<string, string>();

interface Facility {
    facilityId: string | number;
    name: string;
    // add other fields if needed
}

// API response type
interface FacilitySearchResponse {
    facilities?: Facility[];
    data?: Facility[];
    results?: Facility[];
    // Handle different possible response structures
}

// Resolve Facility ID using Puppeteer to bypass protection
export async function resolveFacilityId(courseName: string): Promise<string | null> {
    if (facilityCache.has(courseName)) return facilityCache.get(courseName)!;

    const searchUrl = `https://www.golfnow.com/api/ui/facilities/search?query=${encodeURIComponent(courseName)}`;
    console.log("Calling: " + searchUrl);

    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Set realistic viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        // Enable request interception to handle API calls
        await page.setRequestInterception(true);
        
        let apiResponse: any = null;
        
        page.on('request', (request) => {
            // Allow all requests to proceed
            request.continue();
        });
        
        page.on('response', async (response) => {
            if (response.url().includes('/api/ui/facilities/search')) {
                try {
                    const contentType = response.headers()['content-type'];
                    if (contentType && contentType.includes('application/json')) {
                        apiResponse = await response.json();
                        console.log('Captured API response:', apiResponse);
                    }
                } catch (error) {
                    console.error('Error parsing API response:', error);
                }
            }
        });

        // Navigate to GolfNow search page first to establish session
        await page.goto('https://www.golfnow.com/', { waitUntil: 'networkidle2' });
        
        // Wait a bit for any initial scripts to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Now make the API request
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        
        // Give it time to process the API response
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (apiResponse) {
            // Type guard to ensure we have an array
            let facilities: Facility[] = [];
            
            if (Array.isArray(apiResponse)) {
                facilities = apiResponse as Facility[];
            } else if (apiResponse && typeof apiResponse === 'object') {
                const response = apiResponse as FacilitySearchResponse;
                facilities = response.facilities || response.data || response.results || [];
            }

            if (Array.isArray(facilities) && facilities.length > 0) {
                const match = facilities.find((facility: Facility) =>
                    facility.name?.toLowerCase().includes(courseName.toLowerCase())
                );

                if (match && match.facilityId) {
                    const facilityIdString = match.facilityId.toString();
                    facilityCache.set(courseName, facilityIdString);
                    return facilityIdString;
                }
            }
        }
        
        console.warn("No matching facility found for:", courseName);
        return null;
        
    } catch (error) {
        console.error("Error during facility search with Puppeteer:", error);
        return null;
    } finally {
        await browser.close();
    }
}
// Scrape tee times for a given facility and date
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