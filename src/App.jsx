import React, { useState, useRef, useEffect } from 'react';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css';

function App() {
  const [isChatMode, setIsChatMode] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleOpenChat = () => {
    if (!isChatMode && !isVoiceMode) {
      setIsVoiceMode(true);
      setIsChatMode(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue('');

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: "I'm LUCA. How can I help you today?" }]);
    }, 1000);
  };

  const handleVoiceSuccess = () => {
    setIsVoiceMode(false);
    setIsChatMode(true);
    const transcribedText = "What's the weather like today?";
    setMessages(prev => [...prev, { role: 'user', content: transcribedText }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: "It looks like it will be sunny with a high of 75°F today." }]);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <main className={`app-main ${isChatMode ? 'chat-mode' : 'fade-in'}`}>
        
        {/* Voice Mode Top Bar */}
        {isVoiceMode && (
          <div className="top-bar slide-down">
            <button className="icon-btn-light" aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <button className="icon-btn-light" aria-label="History">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>
            </button>
          </div>
        )}

        {/* Center Content for Home and Voice Mode */}
        {(!isChatMode || isVoiceMode) && (
          <div className="center-content">
            <div className="sparkle-logo pulse">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4285f4" />
                    <stop offset="33%" stopColor="#9b72cb" />
                    <stop offset="66%" stopColor="#d96570" />
                    <stop offset="100%" stopColor="#f4b400" />
                  </linearGradient>
                </defs>
                <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" fill="url(#sparkleGrad)" />
              </svg>
            </div>
            <h1 className="welcome-text">Welcome</h1>
          </div>
        )}

        {/* Chat History */}
        {isChatMode && !isVoiceMode && (
          <div className="chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Bottom Search Bar (Home / Chat Mode) */}
        {!isVoiceMode && (
          <div className="bottom-bar-container slide-up">
            <form className="search-bar" onClick={handleOpenChat} onSubmit={handleSend}>
              {isChatMode ? (
                <input 
                  ref={inputRef}
                  className="chat-input"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Ask LUCA"
                />
              ) : (
                <span className="placeholder-text" style={{ marginLeft: '1rem' }}>Ask LUCA</span>
              )}
              
              <button type="button" className="icon-btn mic-btn" aria-label="Voice input" onClick={(e) => { e.stopPropagation(); setIsVoiceMode(true); setIsChatMode(false); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Voice Bottom Controls */}
        {isVoiceMode && (
          <div className="voice-bottom-controls slide-up">
            <button className="voice-btn" aria-label="Cancel" onClick={() => setIsVoiceMode(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <div className="voice-glow-btn"></div>
            
            <button className="voice-btn" aria-label="Done" onClick={handleVoiceSuccess}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </div>
        )}

      </main>

      <PWABadge />
    </>
  );
}

export default App;
