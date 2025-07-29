// pages/api/tee-times.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { WebAgent } from '../../lib/webAgent';
import { getCourseDetails } from '../../lib/golfApi'; // <-- Import the new function
import { queryLLM } from '../../lib/llmAgent';

interface TeeTimeData {
  time: string;
  price?: string;
  availableSpots?: number; // Matches your TeeTime interface from golfApi.ts
  bookingUrl?: string;
}

// Basic state management for the Playwright agent per session/user
const activeAgents: { [key: string]: WebAgent } = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { courseId, date, numPlayers, sessionId, userMessage, lastObservation } = req.body;

  if (!courseId || !date || !numPlayers || !sessionId) {
    return res.status(400).json({ message: 'Missing required parameters: courseId, date, numPlayers, sessionId' });
  }

  let agent = activeAgents[sessionId];
  if (!agent) {
    agent = new WebAgent();
    await agent.init();
    activeAgents[sessionId] = agent;
    setTimeout(() => {
      if (activeAgents[sessionId]) {
        activeAgents[sessionId].close();
        delete activeAgents[sessionId];
        console.log(`Closed inactive agent for session ${sessionId}`);
      }
    }, 5 * 60 * 1000); // 5 minutes inactivity
  }

  try {
    // Use your actual getCourseDetails function
    const course = await getCourseDetails(courseId);
    if (!course || !course.website) {
      // If no website, the AI cannot browse.
      return res.status(404).json({ message: 'Course not found or no website available for AI Browse.' });
    }

    let currentObservation: any = lastObservation;

    // If it's the first interaction for this session/course, or the agent is on a different page, navigate
    if (!lastObservation || (agent.currentPage && agent.currentPage.url() !== course.website)) {
      console.log(`Navigating to course website: ${course.website}`);
      currentObservation = await agent.navigateTo(course.website);
      if (!currentObservation) {
        return res.status(500).json({ message: 'Failed to navigate to course website for tee time retrieval.' });
      }
    }

    // --- LLM Decision Loop ---
    const tools = [
        {
            name: 'navigateTo',
            description: 'Navigates the browser to a given URL.',
            parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
        },
        {
            name: 'clickElement',
            description: 'Clicks an element on the current page using a CSS selector.',
            parameters: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
        },
        {
            name: 'fillInput',
            description: 'Fills an input field on the current page using a CSS selector and a value.',
            parameters: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } }, required: ['selector', 'value'] }
        },
        {
            name: 'selectOption',
            description: 'Selects an option from a dropdown (select) element using a CSS selector and a value.',
            parameters: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } }, required: ['selector', 'value'] }
        },
        {
          name: 'findTeeTimesOnPage',
          description: `Call this when you believe you have navigated to the correct page for displaying tee times, and the tee times for ${numPlayers} players on ${date} are visible or can be extracted. If a direct list of times is not found but form elements (date picker, time picker, player count) are present, the tool will return an empty list, and the AI should then use other tools to interact with the form.`,
          parameters: { type: 'object', properties: {}, required: [] }
        },
        {
            name: 'selectBookingDate',
            description: 'Selects a specific date in a date picker element.',
            parameters: { type: 'object', properties: { selector: { type: 'string' }, date: { type: 'string', 
                // format: 'date' 
            } }, required: ['selector', 'date'] }
        },
        {
            name: 'setNumPlayers',
            description: 'Sets the number of players in a numerical input or selector.',
            parameters: { type: 'object', properties: { selector: { type: 'string' }, numPlayers: { type: 'number' } }, required: ['selector', 'numPlayers'] }
        },
        {
            name: 'selectBookingTime',
            description: 'Selects a specific time from a time picker or list of time slots.',
            parameters: { type: 'object', properties: { selector: { type: 'string' }, time: { type: 'string' } }, required: ['selector', 'time'] }
        },
        {
            name: 'clickSubmitBookingSearch',
            description: 'Clicks the button to submit the booking criteria form.',
            parameters: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
        }
    ];

    let actionResponse;
    let teeTimesFound: TeeTimeData[] = [];
    let thoughtProcess = 'Starting to analyze the page.';
    let statusMessage = 'Analyzing page...';
    let maxIterations = 5; // Allow for multiple steps (e.g., click date picker, select date, click search)
    let finalRedirectUrl: string | undefined = undefined;

    let currentAgentObservation = currentObservation;

    for (let i = 0; i < maxIterations; i++) {
      console.log(`LLM Interaction Iteration ${i + 1}`);
      const llmResult = await queryLLM(
        `You are an AI assistant tasked with finding golf tee times on a website.
        The user wants to book a tee time for ${numPlayers} players on ${date} at ${course.name}.
        The current URL is: ${currentObservation.url}
        Page Title: ${currentObservation.title}
        Page Text Content (truncated to first 1000 chars):\n${currentObservation.textContent.substring(0, 1000)}...\n
        Interactive Elements (selector, type, text/value/placeholder, ariaLabel):
        ${JSON.stringify(currentObservation.interactiveElements, null, 2)}

        Based on the current page and the user's request, decide the next best action to find tee times.
        Look for elements related to date selection, number of players, and search/find buttons.
        If you have successfully navigated to a tee time listing page, use the 'findTeeTimesOnPage' tool.
        If no further automated action is possible or required to find tee times, respond with 'no_action_needed'.
        Be concise in your textual responses and focus on guiding the web Browse process.`,
        tools
      );

      thoughtProcess += `\nLLM Thought: ${llmResult.thought}`;
      statusMessage = llmResult.response || llmResult.thought;

      if (llmResult.toolCall) {
        const { name, args } = llmResult.toolCall;
        console.log(`LLM decided to call tool: ${name} with args:`, args);

        if (name === 'navigateTo') {
            const { url } = args as { url: string }; // Type assertion
            currentObservation = await agent.navigateTo(url);
        } else if (name === 'clickElement') {
            const { selector } = args as { selector: string }; // Type assertion
            currentObservation = await agent.clickElement(selector);
        } else if (name === 'fillInput') {
            const { selector, value } = args as { selector: string; value: string }; // Type assertion
            currentObservation = await agent.fillInput(selector, value);
        } else if (name === 'selectOption') {
          const { selector, value } = args as { selector: string; value: string }; // Type assertion
          currentObservation = await agent.selectOption(selector, value);
        } else if (name === 'findTeeTimesOnPage') {
          // This is where `findTeeTimes` on `WebAgent` needs to be smart.
          // For now, it will look for common patterns, but for a real system,
          // the LLM might provide hints for parsing if it "sees" specific elements.
          teeTimesFound = await agent.findTeeTimes(date, numPlayers);
          statusMessage = 'Tee times extracted successfully!';
          break; // Exit loop, we found times
        } 
        if (!currentObservation) {
          statusMessage = 'An error occurred during web interaction, page might not have loaded correctly.';
          break;
        }
      } else if (llmResult.response.includes('no_action_needed') || llmResult.response.includes('cannot determine a clear next action')) {
        statusMessage = llmResult.response || 'AI could not determine how to find tee times.';
        if (currentAgentObservation?.url) {
            finalRedirectUrl = currentAgentObservation.url;
            statusMessage += ` You may need to complete the booking manually at: ${finalRedirectUrl}`;
        }
        break; // LLM is done or stuck
      } else {
        // LLM provided a textual response, not a tool call. Could be clarifying or indicating a halt.
        statusMessage = llmResult.response;
        break;
      }
    }

    res.status(200).json({
      teeTimes: teeTimesFound,
      observation: currentObservation,
      status: statusMessage,
      thought: thoughtProcess,
      message: statusMessage,
      redirectUrl: finalRedirectUrl,
    });

  } catch (error) {
    console.error('Error in tee-times API:', error);
    res.status(500).json({ message: 'Internal server error while retrieving tee times.', error: (error as Error).message});
  } finally {
    // Agent cleanup is handled by timeout; no explicit close here for potential follow-up actions
  }
}