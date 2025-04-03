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

  // Handle sending message on Enter key
  const handleKeyPress = async (e) => {
    if (e.key === "Enter" && input.trim()) {
      // Add user's message to chat
      const userMessage = { text: input, sender: "user" };
      setMessages((prev) => [...prev, userMessage]);
      
      // Send to backend
      try {
        const response = await fetch(`http://localhost:5001/chat?query=${encodeURIComponent(input)}`, {
          method: "GET",
        });
        const data = await response.json();
        const botMessage = { text: data.response || "No response from server", sender: "bot" };
        setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
        const errorMessage = { text: "Error connecting to server", sender: "bot" };
        setMessages((prev) => [...prev, errorMessage]);
      }
      
      // Clear input
      setInput("");
    }
  };

  return (
    <div className="chat-interface">
      <h2>BART Assistant</h2>
      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about BART parking, alerts, etc..."
          className="chat-input"
        />
      </div>
    </div>
  );
};

export default ChatInterface;