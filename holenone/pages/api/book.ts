// // // pages/api/book.ts
// // import type { NextApiRequest, NextApiResponse } from 'next';
// // import { WebAgent } from '../../lib/webAgent';
// // import { queryLLM } from '../../lib/llmAgent';
// // import { getPlaceDetails } from '../../lib/golfApi'; // <-- Import the new function

// // // Use the same activeAgents object or manage new ones specifically for booking
// // const activeAgents: { [key: string]: WebAgent } = {}; // Assume similar management

// // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ message: 'Method Not Allowed' });
// //   }

// //   const { courseId, teeTime, userDetails, sessionId, currentObservation } = req.body;

// //   if (!courseId || !teeTime || !userDetails || !sessionId || !currentObservation) {
// //     return res.status(400).json({ message: 'Missing required parameters for booking.' });
// //   }

// //   let agent = activeAgents[sessionId];
// //   if (!agent) { // Initialize if not found (should ideally be passed from tee-times API)
// //     agent = new WebAgent();
// //     await agent.init();
// //     activeAgents[sessionId] = agent;
// //     setTimeout(() => { // Add timeout for new agents too
// //       if (activeAgents[sessionId]) {
// //         activeAgents[sessionId].close();
// //         delete activeAgents[sessionId];
// //         console.log(`Closed inactive agent for session ${sessionId}`);
// //       }
// //     }, 5 * 60 * 1000);
// //   }

// //   try {
// //     const course = await getPlaceDetails(courseId); // Get course details for website URL
// //     if (!course || !course.website) {
// //         return res.status(404).json({ message: 'Course not found or no website available for AI Browse.' });
// //     }

//     // Ensure the agent is on the correct page for booking, or navigate to it if needed.
//     // This is a critical step for robustness. The `currentObservation` should ideally be
//     // the state of the browser *just before* attempting to book the specific tee time.
//     if (agent.currentPage?.url() !== currentObservation.url) {
//         console.log(`Agent URL mismatch, navigating to last known observation URL: ${currentObservation.url}`);
//         const navigationResult = await agent.navigateTo(currentObservation.url);
//         if (!navigationResult) {
//             return res.status(500).json({ success: false, message: 'Failed to re-navigate to the booking page.' });
//         }
//     }


//     // LLM will guide the booking process
//     const tools = [
//       {
//         name: 'clickElement',
//         description: 'Clicks an element on the current page using a CSS selector.',
//         parameters: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }
//       },
//       {
//         name: 'fillInput',
//         description: 'Fills an input field on the current page using a CSS selector and a value.',
//         parameters: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } }, required: ['selector', 'value'] }
//       },
//       {
//         name: 'selectOption',
//         description: 'Selects an option from a dropdown (select) element using a CSS selector and a value.',
//         parameters: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } }, required: ['selector', 'value'] }
//       },
//       {
//         name: 'completeBookingForm',
//         description: 'Indicates that all user details have been filled and the final booking button should be clicked. This implies the next step is actual confirmation.',
//         parameters: { type: 'object', properties: {} } // No params, just a signal
//       }
//     ];

//     let bookingResult: any = { success: false, message: 'AI processing booking...' };
//     let currentAgentObservation = currentObservation; // Start with the observation from tee-time search

//     let maxBookingIterations = 5; // Allow multiple steps for filling form/clicking buttons
//     let llmResult: any;
//     for (let i = 0; i < maxBookingIterations; i++) {
//         console.log(`LLM Booking Interaction Iteration ${i + 1}`);

//         llmResult = await queryLLM(
//             `You are an AI assistant tasked with completing a golf tee time booking.
//             The user wants to book the tee time: ${teeTime.time} for ${userDetails.name}, email: ${userDetails.email}, phone: ${userDetails.phone}.
//             The current URL is: ${currentAgentObservation.url}
//             Page Text Content (truncated to first 1000 chars):\n${currentAgentObservation.textContent.substring(0, 1000)}...\n
//             Interactive Elements (selector, type, text/value/placeholder, ariaLabel):
//             ${JSON.stringify(currentAgentObservation.interactiveElements, null, 2)}

//             Your goal is to fill in the provided user details (name, email, phone) into the appropriate form fields and then click the final booking confirmation button.
//             Use 'fillInput' for text fields, 'selectOption' for dropdowns.
//             Once you believe all necessary user details are entered and you've identified the final booking/confirmation button (e.g., "Confirm Booking", "Complete Reservation", "Book Now"),
//             use the 'completeBookingForm' tool.
//             If you need to click something to get to the booking form (e.g. "Select this time"), use 'clickElement'.
//             If no further action is obvious or possible, respond with 'no_action_needed'.`,
//             tools
//         );

//         console.log(`LLM Thought for Booking: ${llmResult.thought}`);
//         bookingResult.message = llmResult.response || llmResult.thought; // Update status for frontend

//         if (llmResult.toolCall) {
//             const { name, args } = llmResult.toolCall;
//             console.log(`LLM decided to call tool for booking: ${name} with args:`, args);

//             if (name === 'clickElement') {
//                 currentAgentObservation = await agent.clickElement(args.selector);
//             } else if (name === 'fillInput') {
//                 currentAgentObservation = await agent.fillInput(args.selector, args.value);
//             } else if (name === 'selectOption') {
//                 currentAgentObservation = await agent.selectOption(args.selector, args.value);
//             } else if (name === 'completeBookingForm') {
//                 // This implies the LLM thinks it has filled all details and is ready to click final button.
//                 // The `initiateBooking` method will perform the final click and confirmation check.
//                 bookingResult = await agent.initiateBooking(teeTime, userDetails);
//                 if (bookingResult.success) {
//                     bookingResult.message = "Booking process completed by AI. Please confirm details on the next page.";
//                 } else {
//                     bookingResult.message = `Booking attempt failed: ${bookingResult.message}`;
//                 }
//                 break; // Booking sequence is done
//             }

//             if (!currentAgentObservation) {
//                 bookingResult = { success: false, message: 'An error occurred during web interaction for booking.' };
//                 break;
//             }
//         } else if (llmResult.response.includes('no_action_needed') || llmResult.response.includes('cannot determine a clear next action')) {
//             bookingResult = { success: false, message: llmResult.response || 'AI could not determine how to proceed with booking.' };
//             break;
//         } else {
//             // LLM provided a textual response, not a tool call.
//             bookingResult = { success: false, message: llmResult.response };
//             break;
//         }
//     }


//     res.status(200).json({
//       success: bookingResult.success,
//       message: bookingResult.message,
//       confirmationUrl: bookingResult.confirmationUrl,
//       observation: currentAgentObservation, // Send this back for potential manual review/debugging
//       thought: llmResult.thought, // The last thought from the LLM
//     });

//   } catch (error) {
//     console.error('Error in book API:', error);
//     res.status(500).json({ success: false, message: 'Internal server error during booking.', error: (error as Error).message });
//   } finally {
//     // Agent cleanup handled by timeout
//   }
// }