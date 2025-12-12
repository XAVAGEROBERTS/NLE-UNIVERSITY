// src/components/common/AIChat.jsx
import React, { useState, useRef, useEffect } from 'react';

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, content: "Hello! I'm your University AI Assistant. How can I help you today?", sender: 'ai', time: 'Just now' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      content: input,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can help you with course schedules, assignment deadlines, and exam information.",
        "Your next assignment is due in 3 days for Computer Architecture.",
        "The library is open from 8 AM to 10 PM on weekdays.",
        "For technical issues, please contact the IT support desk at support@nle.edu.",
        "Your GPA for this semester is 3.8. Keep up the good work!"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const aiMessage = {
        id: messages.length + 2,
        content: randomResponse,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <div 
        className="ai-chat-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          backgroundColor: '#4361ee',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(67, 97, 238, 0.3)',
          zIndex: 1000,
        }}
      >
        <i className="fas fa-robot"></i>
      </div>

      {/* Chat Container */}
      {isOpen && (
        <div 
          className="ai-chat-container"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '30px',
            width: '350px',
            height: '500px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div 
            className="ai-chat-header"
            style={{
              backgroundColor: '#4361ee',
              color: 'white',
              padding: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem' }}>AI Assistant</h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.2rem',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Messages */}
          <div 
            className="ai-chat-body"
            style={{
              flex: 1,
              padding: '15px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
            }}
          >
            {messages.map((message) => (
              <div 
                key={message.id}
                style={{
                  marginBottom: '10px',
                  textAlign: message.sender === 'user' ? 'right' : 'left',
                }}
              >
                <div 
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: '18px',
                    backgroundColor: message.sender === 'user' ? '#4361ee' : 'white',
                    color: message.sender === 'user' ? 'white' : '#333',
                    maxWidth: '80%',
                    border: message.sender === 'ai' ? '1px solid #dee2e6' : 'none',
                  }}
                >
                  {message.content}
                </div>
                <div 
                  style={{
                    fontSize: '0.7rem',
                    color: '#6c757d',
                    marginTop: '4px',
                  }}
                >
                  {message.time}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div 
            className="ai-chat-input"
            style={{
              borderTop: '1px solid #dee2e6',
              padding: '15px',
              display: 'flex',
              gap: '10px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question..."
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
            <button 
              onClick={handleSend}
              style={{
                backgroundColor: '#4361ee',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 15px',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;