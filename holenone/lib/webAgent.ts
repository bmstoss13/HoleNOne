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

    public get currentPage(): Page | null {
        return this.page;
    }

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
        if (!this.page) return [];

        const teeTimes: TeeTimeData[] = [];

        // Strategy 1: Look for common tee time patterns
        const genericTimeElements = await this.page.$$eval(
        '.tee-time-slot, .time-slot, [data-testid*="tee-time"], [aria-label*="tee time"]',
        (elements) =>
            elements.map((el) => {
            // Attempt to extract time, price, and availability from common places
            const time = el.textContent?.match(/\d{1,2}:\d{2}\s?(AM|PM)?/i)?.[0] || el.getAttribute('data-time') || '';
            const price = el.querySelector('.price, .fee, [data-price]')?.textContent?.trim() || el.getAttribute('data-price') || '';
            const availableSlots = el.textContent?.match(/(\d+)\s*spots|\s*(\d+)\s*players/i)?.[1] || el.getAttribute('data-available-slots');

            return {
                time: time,
                price: price || undefined,
                availableSlots: availableSlots ? parseInt(availableSlots, 10) : undefined,
                // We can't always get a direct booking URL for a specific slot without navigating more
                // bookingUrl: el.href // If it's an anchor tag with a direct link
            };
            }).filter(t => t.time) // Filter out elements that didn't yield a recognizable time
        );
        teeTimes.push(...genericTimeElements);

        // Strategy 2: If the above is too generic, the LLM's `interactiveElements`
        // might contain more specific hints. We could feed the LLM's "thought"
        // or further instructions into this function.
        // For now, it's a generic scan.

        // Filter by requested number of players (if applicable and detected)
        const filteredTeeTimes = teeTimes.filter(t => t.availableSlots === undefined || t.availableSlots >= numPlayers);

        // Sort by time
        filteredTeeTimes.sort((a, b) => {
        const timeA = new Date(`2000/01/01 ${a.time}`); // Use a dummy date for time comparison
        const timeB = new Date(`2000/01/01 ${b.time}`);
        return timeA.getTime() - timeB.getTime();
        });

        return filteredTeeTimes;
    }
  async initiateBooking(teeTime: TeeTimeData, userDetails: { name: string; email: string; phone: string }): Promise<{ success: boolean; confirmationUrl?: string; message: string }> {
    if (!this.page) return { success: false, message: 'Agent not initialized.' };

    try {
      // Again, this is highly dependent on the target website.
      // The LLM would generate the sequence of actions.

      // Example sequence for a known booking form:
      // 1. Click on the specific tee time element if not already on the booking form.
      //    This might be handled by the LLM choosing the `initiate_booking_flow` tool.
      //    If teeTime.bookingUrl exists, navigate there.
      if (teeTime.bookingUrl) {
          await this.navigateTo(teeTime.bookingUrl);
      } else {
          // Assuming the LLM has already clicked the tee time and we are on the booking form
          // Or LLM specifies which element to click to begin booking
          // e.g. await this.clickElement(teeTime.selector);
      }
      await this.page.waitForLoadState('domcontentloaded');

      // 2. Fill out player details
      await this.fillInput('#player-name-input', userDetails.name);
      await this.fillInput('#player-email-input', userDetails.email);
      await this.fillInput('#player-phone-input', userDetails.phone);
      // ... potentially more fields for multiple players ...

      // 3. Handle any waivers or checkboxes
      // await this.clickElement('#agree-checkbox');

      // 4. Click the "Confirm Booking" or "Proceed to Payment" button
      // IMPORTANT: For the challenge, you need to reach the point where the booking
      // is *actual*. This means you might need to bypass or simulate payment.
      // For public courses, this often means completing the form and clicking a
      // "Book Now" or "Complete Reservation" button.
      // If payment is required, you'd get to the payment page.
      // The rule "cancel later (not AI required)" implies you manually handle payment/cancellation.

      // LLM would choose the appropriate selector:
      await this.clickElement('button:has-text("Confirm Booking"), button:has-text("Complete Reservation"), input[type="submit"][value="Book Now"]');

      await this.page.waitForNavigation({ waitUntil: 'networkidle' }); // Wait for booking confirmation page

      // 5. Check for confirmation
      const currentUrl = this.page.url();
      const pageText = (await this.page.textContent('body')) ?? '';

      if (currentUrl.includes('confirmation') || pageText.includes('Booking Confirmed') || pageText.includes('Thank you for your reservation')) {
        return { success: true, confirmationUrl: currentUrl, message: 'Tee time successfully initiated/booked.' };
      } else {
        // Look for common error messages
        const errorMessage = await this.page.textContent('.error-message, .alert-danger');
        return { success: false, message: `Booking failed or not confirmed. Current URL: ${currentUrl}. Message: ${errorMessage || 'No specific error message found.'}` };
      }

    } catch (error) {
      console.error(`Error during booking:`, error);
      return { success: false, message: `An error occurred during the booking process: ${(error as Error).message}` };
    }
  }
}