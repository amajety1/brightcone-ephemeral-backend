import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import VapiModule from "@vapi-ai/web";
const Vapi = VapiModule.default; // Extract the constructor

const ChatInterface = () => {
  const [messages, setMessages] = useState([]); // Store chat history
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [assistantVolume, setAssistantVolume] = useState(0); // Track assistant volume
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if user is speaking
  const vapiRef = useRef(null);
  const messagesEndRef = useRef(null); // Ref for auto-scrolling

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    try {
      console.log("Initializing Vapi...");
      // Initialize with your public key
      vapiRef.current = new Vapi("7c7ee264-c104-495a-9e3b-bc22567228df");
      console.log("Vapi initialized successfully");
      
      // Set up event listeners
      setupEventListeners();
    } catch (error) {
      console.error("Failed to initialize Vapi:", error);
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);
  
  const setupEventListeners = () => {
    if (!vapiRef.current) return;
    
    // Listen for speech start events
    vapiRef.current.on("speech-start", () => {
      console.log("Assistant speech has started.");
    });
    
    // Listen for speech end events
    vapiRef.current.on("speech-end", () => {
      console.log("Assistant speech has ended.");
    });
    
    // Listen for call start events
    vapiRef.current.on("call-start", () => {
      console.log("Call has started.");
    });
    
    // Listen for call end events
    vapiRef.current.on("call-end", () => {
      console.log("Call has ended.");
      setIsCallActive(false);
      setIsSpeaking(false);
    });
    
    // Listen for volume level updates
    vapiRef.current.on("volume-level", (volume) => {
      setAssistantVolume(volume);
    });
    
    // Listen for messages
    vapiRef.current.on("message", (message) => {
      console.log("Received message:", message);
      if (message.type === "transcript") {
        // Show speaking animation instead of transcript text
        console.log("User is speaking:", message.transcript);
        setIsSpeaking(true);
        
        // Hide the speaking animation after a short delay
        setTimeout(() => {
          setIsSpeaking(false);
        }, 1500);
      } else if (message.type === "assistant-message") {
        // Handle assistant messages
        const assistantMessage = { 
          text: message.text, 
          sender: "bot" 
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    });
    
    // Listen for errors
    vapiRef.current.on("error", (error) => {
      console.error("Vapi error:", error);
    });
  };

  const handleStartCall = async () => {
    try {
      if (!vapiRef.current) throw new Error("Vapi not initialized");
      
      // Use the assistant ID directly as recommended in the docs
      const callResponse = await vapiRef.current.start("f474d055-3bf8-472a-ac5a-0d033cf97e0d");
      console.log("Call started:", callResponse);
      
      setIsCallActive(true);
      setMessages([]);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleStopCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      setIsCallActive(false);
      setIsMuted(false);
      setIsSpeaking(false);
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuteState = !isMuted;
      vapiRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
    }
  };

  return (
    <div className="voice-interface">
      <div className="header">
        <h1>BART Voice Assistant</h1>
      </div>

      <div className="assistant-container">
        {!isCallActive ? (
          <div className="start-container">
            <button className="mic-button" onClick={handleStartCall}>
              <div className="mic-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16C14.2091 16 16 14.2091 16 12V6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6V12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Start Voice Assistant</span>
            </button>
          </div>
        ) : (
          <div className="active-assistant">
            <div className="control-buttons">
              <button 
                className={`control-button ${isMuted ? 'muted' : ''}`} 
                onClick={toggleMute}
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 12C15 12.5304 14.7893 13.0391 14.4142 13.4142C14.0391 13.7893 13.5304 14 13 14M3 3L21 21M11 5.08C11.6 5.03 12.3 5 13 5C18.5 5 23 9.5 23 16C23 16.7 22.97 17.4 22.92 18M19.4 15C19.2669 15.6255 19.0277 16.2272 18.7 16.79M15 19C14.5 19.2 14 19.35 13.5 19.44M8.7 8.7C8.25436 9.14563 8 9.75779 8 10.4V13.6C8 14.8402 8.42143 16.0444 9.22 17M12.5 12.5L11 17L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 18C14.2091 18 16 16.2091 16 14V6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6V14C8 16.2091 9.79086 18 12 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 9H3C3 14.5911 7.58842 19 13 19V16C9.58172 16 6.87401 12.9674 6.87401 9.5H6V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 9H21C21 14.5911 16.4116 19 11 19V16C14.4183 16 17.126 12.9674 17.126 9.5H18V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              <button className="control-button stop" onClick={handleStopCall}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {isSpeaking && (
              <div className="speech-indicator">
                <div className="pulse-rings">
                  <div className="ring"></div>
                  <div className="ring"></div>
                  <div className="ring"></div>
                </div>
                <div className="mic-active">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16C14.2091 16 16 14.2091 16 12V6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6V12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            
            {assistantVolume > 0 && (
              <div className="volume-indicator-container">
                <div className="volume-indicator" style={{ width: `${assistantVolume * 100}%` }}></div>
              </div>
            )}

            <div className="messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;