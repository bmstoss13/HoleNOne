import { chromium, Browser, Page } from 'playwright';

interface TeeTimeData {
    time: string;
    price?: string;
    availableSlots?: number;
    bookingUrl?: string;
}

interface PageObservation {
    url: string;
    title: string;
    textContent: string; // Simplified text content of the page
    interactiveElements: Array<{
        selector: string; // CSS selector
        type: string; // e.g., 'button', 'input', 'select', 'link'
        text?: string;
        value?: string;
        placeholder?: string;
        ariaLabel?: string;
        // Potentially add coordinates for visual-based LLM, but textual is easier
    }>;
}

const headlessMode=true; //switch to false if debugging.

export class WebAgent {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async init() {
        this.browser = await chromium.launch({ headless: headlessMode });
        this.page = await this.browser.newPage(); //open new page.
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser=null; 
            this.page=null;
        }
    }

    async navigateTo(url: string): Promise<PageObservation | null> {
        if(!this.page) {
            await this.init();
        }
        try {
            await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
            return this.getCurrentPageObservation();
        } catch(error) {
            console.error(`Failed to navigate to ${url}:`, error);
            return null;
        }
    }

    //LLM-controlled actions! Yay!

    async clickElement(selector: string): Promise<PageObservation | null> {
        if (!this.page) return null;
        try {
            await this.page.click(selector);
            await this.page.waitForLoadState('domcontentloaded'); //Wait for page update
            return this.getCurrentPageObservation();
        } catch (error){
            console.error(`Failed to click element ${selector}:`, error);
            return null;
        }
    }

    async fillInput(selector: string, value: string): Promise<PageObservation | null> {
        if(!this.page) return null;
        try {
            await this.page.fill(selector, value);
            return this.getCurrentPageObservation();
        } catch(error){
            console.error(`Failed to fill input ${selector}:`, error);
            return null;
        }
    }

    async selectOption(selector: string, value: string): Promise<PageObservation | null> {
        if(!this.page) return null;
        try{
            await this.page.selectOption(selector, value);
            await this.page.waitForLoadState('domcontentloaded');
            return this.getCurrentPageObservation();
        } catch (error){
            console.error(`Failed to select option ${selector}:`, error);
            return null;
        }
    }


    async getCurrentPageObservation(): Promise<PageObservation | null> {
        if (!this.page) return null;

        const url = this.page.url();
        const title = await this.page.title();
        const textContent = await this.page.evaluate(() => document.body.innerText);

    const interactiveElements = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea'));
        return elements.map(el => {
            const tag = el.tagName.toLowerCase();
            let attributes: any = {
                selector: `${tag}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').join('.') : ''}`, // Basic selector
                type: tag,
            };
            if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) {
                attributes.text = el.textContent?.trim();
            } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                attributes.value = el.value;
                attributes.placeholder = el.placeholder;
                attributes.type = el.type; //ex: 'text', 'date', 'submit'
            } else if (el instanceof HTMLSelectElement) {
                attributes.value = el.value;
            }
            if (el.ariaLabel) {
                attributes.ariaLabel = el.ariaLabel;
            }
            return attributes;
            });
        });

        return { url, title, textContent, interactiveElements };
    }

    async findTeeTimes(date: string, numPlayers: number): Promise<TeeTimeData[]> {
        if(!this.page) return [];

        //eventually need to implement the following:
        // The LLM (or a meta-prompting layer) would analyze PageObservation
        // and instruct Playwright on what to click/fill.
        // For a demo, might need to hardcode logic for 1-2 specific course booking systems.

        // Example: (Highly simplified and would need dynamic LLM interaction)
        // 1. LLM identifies a date picker.
        // 2. LLM instructs Playwright: `await this.fillInput('#date-input', date);` or `await this.clickElement('.next-day-button');`
        // 3. LLM identifies number of players dropdown.
        // 4. LLM instructs Playwright: `await this.selectOption('#players-select', String(numPlayers));`
        // 5. LLM identifies search button.
        // 6. LLM instructs Playwright: `await this.clickElement('#search-tee-times');`
        // 7. After the page updates, LLM analyzes the `textContent` and `interactiveElements`
        //    to identify elements that look like tee times.

        // For the initial implementation, feed the PageObservation to LLM API.
        // The LLM would then "decide" the next action (e.g., click a specific button).
        //API route would then execute that action via WebAgent.
        // Placeholder for actual tee time extraction logic (after navigation by LLM):
    const teeTimes: TeeTimeData[] = [];
    const elements = await this.page.$$eval('.tee-time-slot, .available-time', (els) =>
      els.map((el) => ({
        time: el.textContent?.trim() || '',
        price: el.querySelector('.price')?.textContent?.trim(),
      }))
    );
    teeTimes.push(...elements);

    return teeTimes;
  }
}