// pages/components/Chatbot.tsx

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react'; // Import icons
import styles from '../styling/index.module.css'; // Import CSS module

// Define the structure for a chat message, matching your API's OpenAI format
interface ChatMessage {
    role: 'user' | 'assistant'; // OpenAI uses 'assistant' for model responses
    content: string; // OpenAI uses 'content' for message text
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    initialMessage?: string; // Optional initial message from the AI
}

export default function Chatbot({ isOpen, onClose, initialMessage }: ChatbotProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

    // Add initial message when component mounts or initialMessage changes
    useEffect(() => {
        if (initialMessage && messages.length === 0) {
            // Ensure initial message is in the correct ChatMessage format
            setMessages([{ role: 'assistant', content: initialMessage }]);
        }
    }, [initialMessage, messages.length]); // Depend on initialMessage and messages.length

    // Auto-scroll to the bottom of the chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]); // Scroll whenever messages change

    const sendMessage = async () => {
        if (input.trim() === '' || isLoading) return;

        // Create user message in the correct ChatMessage format
        const userMessage: ChatMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content, // Send content directly
                    history: messages // Send current messages state as history (API will append user message)
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API error: ${response.status}`);
            }

            const data: { response: string; history: ChatMessage[] } = await response.json();
            // The API returns the full updated history, so we can just set it
            setMessages(data.history); 

        } catch (error: any) {
            console.error('Error sending message:', error);
            // Ensure error message is also in the correct ChatMessage format
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message || 'Could not get a response.'}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles['chatbot-container']}>
            {/* Chat Header */}
            <div className={styles['chatbot-header']}>
                <h3 className={styles['chatbot-title']}>
                    <Bot size={20} /> Birdie AI
                </h3>
                <button onClick={onClose} className={styles['chatbot-close-button']}>
                    <X size={20} />
                </button>
            </div>

            {/* Chat Messages Area */}
            <div className={`${styles['chatbot-messages']} ${styles['custom-scrollbar']}`}>
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`${styles['chatbot-message-wrapper']} ${
                            msg.role === 'user' ? styles['chatbot-message-user-wrapper'] : styles['chatbot-message-ai-wrapper']
                        }`}
                    >
                        <div className={`${styles['chatbot-message']} ${
                            msg.role === 'user' ? styles['chatbot-message-user'] : styles['chatbot-message-ai']
                        }`}>
                            {msg.content} {/* <--- CHANGED FROM msg.parts[0].text to msg.content */}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className={`${styles['chatbot-message-wrapper']} ${styles['chatbot-message-ai-wrapper']}`}>
                        <div className={`${styles['chatbot-message']} ${styles['chatbot-message-ai']}`}>
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} /> {/* Scroll target */}
            </div>

            {/* Chat Input */}
            <div className={styles['chatbot-input-area']}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    placeholder="Type your message..."
                    className={styles['chatbot-input']}
                    disabled={isLoading}
                />
                <button 
                    onClick={sendMessage} 
                    className={styles['chatbot-send-button']}
                    disabled={isLoading}
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}
