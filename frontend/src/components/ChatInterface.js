// import React, { useState, useEffect, useRef } from 'react';
// import './ChatInterface.css';
// import VapiModule from "@vapi-ai/web";
// const Vapi = VapiModule.default; // Extract the constructor

// const ChatInterface = () => {
//   const [isCallActive, setIsCallActive] = useState(false);
//   const [isMuted, setIsMuted] = useState(false);
//   const vapiRef = useRef(null);

//   useEffect(() => {
//     try {
//       console.log("Initializing Vapi...");
//       vapiRef.current = new Vapi("7c7ee264-c104-495a-9e3b-bc22567228df");
//       console.log("Vapi initialized successfully");
//     } catch (error) {
//       console.error("Failed to initialize Vapi:", error);
//     }

//     return () => {
//       if (vapiRef.current) {
//         vapiRef.current.stop();
//       }
//     };
//   }, []);

//   const handleStartCall = async () => {
//     try {
//       if (!vapiRef.current) throw new Error("Vapi not initialized");
//       await vapiRef.current.start("f474d055-3bf8-472a-ac5a-0d033cf97e0d");
//       setIsCallActive(true);
//     } catch (error) {
//       console.error("Error starting call:", error);
//     }
//   };

//   const handleStopCall = () => {
//     if (vapiRef.current) {
//       vapiRef.current.stop();
//       setIsCallActive(false);
//       setIsMuted(false);
//     }
//   };

//   const toggleMute = () => {
//     if (vapiRef.current) {
//       const newMuteState = !isMuted;
//       vapiRef.current.setMuted(newMuteState);
//       setIsMuted(newMuteState);
//     }
//   };

//   return (
//     <div className="chat-interface">
//       <h2>Voice Assistant</h2>
//       <div className="controls">
//         {!isCallActive ? (
//           <button className="start-button" onClick={handleStartCall}>
//             Start Call
//           </button>
//         ) : (
//           <>
//             <button className="stop-button" onClick={handleStopCall}>
//               Stop Call
//             </button>
//             <button
//               className={`mute-button ${isMuted ? 'muted' : ''}`}
//               onClick={toggleMute}
//             >
//               {isMuted ? 'Unmute' : 'Mute'}
//             </button>
//           </>
//         )}
//       </div>
//       <div className="status">
//         Status: {isCallActive ? 'Connected' : 'Disconnected'}
//       </div>
//     </div>
//   );
// };

// export default ChatInterface;

import React, { useState } from "react";
import "./ChatInterface.css";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]); // Store chat history
  const [input, setInput] = useState(""); // Store current input
  const [isLoading, setIsLoading] = useState(false); // Track loading state

  // Handle sending message on Enter key
  const handleKeyPress = async (e) => {
    if (e.key === "Enter" && input.trim()) {
      // Add user's message to chat
      const userMessage = { text: input, sender: "user" };
      setMessages((prev) => [...prev, userMessage]);
      
      // Set loading state
      setIsLoading(true);
      
      // Send to backend
      try {
        const response = await fetch(`http://localhost:5001/chat?query=${encodeURIComponent(input)}`, {
          method: "GET",
        });
        const data = await response.json();
        
        // Just display the raw JSON response
        const botMessage = { 
          text: JSON.stringify(data, null, 2), 
          sender: "bot"
        };
        
        setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
        console.error("Error connecting to server:", error);
        const errorMessage = { text: "Error connecting to server", sender: "bot" };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      
      // Clear input
      setInput("");
    }
  };

  // Handle send button click
  const handleSendClick = () => {
    if (input.trim()) {
      handleKeyPress({ key: "Enter" });
    }
  };

  return (
    <div className="chat-interface">
      <h2>BART Assistant</h2>
      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <pre className="json-response">{msg.text}</pre>
            </div>
          ))}
          {isLoading && (
            <div className="message bot loading">
              <div className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          )}
        </div>
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about BART parking, alerts, etc..."
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            onClick={handleSendClick}
            disabled={!input.trim() || isLoading}
            className="send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;