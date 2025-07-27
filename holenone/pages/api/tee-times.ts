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
        description: 'Analyzes the current page to extract available tee times and their details. Only call this when you believe you are on a tee time availability page.',
        parameters: { type: 'object', properties: {} }
      }
    ];

    let actionResponse;
    let teeTimesFound: TeeTimeData[] = [];
    let thoughtProcess = '';
    let statusMessage = 'Analyzing page...';
    let maxIterations = 5; // Allow for multiple steps (e.g., click date picker, select date, click search)

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
          currentObservation = await agent.navigateTo(args.url);
        } else if (name === 'clickElement') {
          currentObservation = await agent.clickElement(args.selector);
        } else if (name === 'fillInput') {
          currentObservation = await agent.fillInput(args.selector, args.value);
        } else if (name === 'selectOption') {
          currentObservation = await agent.selectOption(args.selector, args.value);
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
        statusMessage = llmResult.response;
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
    });

  } catch (error) {
    console.error('Error in tee-times API:', error);
    res.status(500).json({ message: 'Internal server error while retrieving tee times.', error: (error as Error).message });
  } finally {
    // Agent cleanup is handled by timeout; no explicit close here for potential follow-up actions
  }
}