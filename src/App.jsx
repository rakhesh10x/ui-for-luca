import React, { useState, useRef, useEffect } from 'react';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css';

function App() {
  const [isChatMode, setIsChatMode] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Handle start/stop of listening
  useEffect(() => {
    if (isVoiceMode && recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    } else if (!isVoiceMode && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isVoiceMode]);

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
    
    const finalMessage = transcript.trim() ? transcript : "Hello LUCA!";
    setMessages(prev => [...prev, { role: 'user', content: finalMessage }]);
    setTranscript('');

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: "Got it! I am processing your voice request." }]);
    }, 1000);
  };

  const handleVoiceCancel = () => {
    setIsVoiceMode(false);
    setTranscript('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <main className={`app-main ${isChatMode ? 'chat-mode' : 'fade-in'}`}>
        
        {/* Top Area Cleaned */}

        {/* Center Content for Home and Voice Mode */}
        {(!isChatMode || isVoiceMode) && (
          <div className="center-content">
            {/* Logo removed as requested */}
            <h1 className="welcome-text fade-in-text">
              {isVoiceMode ? (transcript || 'Listening...') : 'Welcome'}
            </h1>
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
            <button className="voice-btn" aria-label="Cancel" onClick={handleVoiceCancel}>
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
