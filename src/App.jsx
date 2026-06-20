import React, { useState, useRef, useEffect } from 'react';
import Starfield from './components/Starfield';
import LoginPage from './components/LoginPage';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  
  const [isChatMode, setIsChatMode] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  
  const wasSecondaryRef = useRef(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const buttonRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Check localStorage for existing session
  useEffect(() => {
    const storedUser = localStorage.getItem('lucaUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.fullName && parsed.mobileNumber) {
          setUser(parsed);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.error("Invalid user data in localStorage");
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

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

  // Handle start/stop of listening and Audio Visualization
  useEffect(() => {
    let streamRef;
    if (isVoiceMode && recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }

      // Audio Visualization
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamRef = stream;
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtxRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          // Spring physics variables
          let smoothedVolume = 0;
          let peakVolume = 0;
          let peakHoldTime = 0;

          // Define 4 orbs with physics state
          // blue goes left, cyan goes mid-left, purple goes mid-right, pink goes right
          const orbs = [
            { id: 'blue', x: 0, vX: 0, s: 1, vS: 0, targetX: -60, idleSpeed: 1.2, idleAmp: 5, stiffness: 0.1, damping: 0.8 },
            { id: 'cyan', x: 0, vX: 0, s: 1, vS: 0, targetX: -20, idleSpeed: 0.9, idleAmp: 7, stiffness: 0.08, damping: 0.85 },
            { id: 'purple', x: 0, vX: 0, s: 1, vS: 0, targetX: 20, idleSpeed: 1.1, idleAmp: 6, stiffness: 0.09, damping: 0.82 },
            { id: 'pink', x: 0, vX: 0, s: 1, vS: 0, targetX: 60, idleSpeed: 1.3, idleAmp: 4, stiffness: 0.12, damping: 0.75 }
          ];

          const renderFrame = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const rawVolume = Math.min(average / 100, 1);

            // Peak hold logic
            if (rawVolume > peakVolume) {
              peakVolume = rawVolume;
              peakHoldTime = 10; // Frames to hold
            } else if (peakHoldTime > 0) {
              peakHoldTime--;
            } else {
              peakVolume += (rawVolume - peakVolume) * 0.05; // Slow decay
            }

            // Smooth volume
            if (peakVolume > smoothedVolume) {
              smoothedVolume += (peakVolume - smoothedVolume) * 0.4;
            } else {
              smoothedVolume += (peakVolume - smoothedVolume) * 0.1;
            }

            if (buttonRef.current) {
              const time = Date.now() / 1000;
              
              // Apply physics to layers
              const layerElements = buttonRef.current.children;
              if (layerElements.length >= 4) {
                for (let i = 0; i < 4; i++) {
                  const orb = orbs[i];
                  
                  // Calculate target X based on volume (spring flow outwards)
                  const baseTargetX = orb.targetX * smoothedVolume * 1.2;
                  
                  // Add idle breathing motion
                  const idleOffset = Math.sin(time * orb.idleSpeed) * orb.idleAmp;
                  const finalTargetX = baseTargetX + idleOffset;
                  
                  // Target scale
                  const finalTargetS = 1 + smoothedVolume * 0.5;

                  // Spring Physics calculation
                  // Acceleration = Stiffness * (Target - Current) - Damping * Velocity
                  const accX = orb.stiffness * (finalTargetX - orb.x);
                  orb.vX = (orb.vX + accX) * orb.damping;
                  orb.x += orb.vX;

                  const accS = orb.stiffness * (finalTargetS - orb.s);
                  orb.vS = (orb.vS + accS) * orb.damping;
                  orb.s += orb.vS;

                  // Apply inline styles for butter-smooth 60fps
                  layerElements[i].style.transform = `translate(calc(-50% + ${orb.x}px), -50%) scale(${orb.s})`;
                }
              }

              // Set container styling for glow and blur dynamically
              const blurVal = 12 + smoothedVolume * 12;
              buttonRef.current.style.setProperty('--glow-opacity', 0.2 + smoothedVolume * 0.5);
              buttonRef.current.style.setProperty('--dynamic-blur', `${blurVal}px`);
              buttonRef.current.style.boxShadow = `0 0 ${20 + smoothedVolume*40}px rgba(81, 45, 168, ${0.2 + smoothedVolume*0.5})`;
            }
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          };
          renderFrame();
        })
        .catch(err => console.error('Mic access denied for viz', err));

    } else if (!isVoiceMode && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVoiceMode]);

  const handleOpenChat = () => {
    setIsVoiceMode(true);
  };

  const handleVoiceSuccess = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    
    setIsVoiceMode(false);
    setIsChatMode(true);
    
    const userMessage = transcript.trim() ? transcript : "Hello, how are you?";
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setTranscript('');

    const dummyResponses = [
      "Hi! I'm doing well. How can I help you today?",
      "I am LUCA. I'm here to assist you with anything you need. What's on your mind?",
      "That's an interesting perspective. Let's discuss it further.",
      "I can certainly help you with that. Here is what I found.",
      "I am an advanced artificial intelligence. I process information at incredible speeds!"
    ];
    const aiResponse = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
    }, 600);
  };

  const handleVoiceCancel = () => {
    setIsVoiceMode(false);
    setTranscript('');
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // History Management for Back Button
  useEffect(() => {
    const isSecondary = isChatMode || isVoiceMode;
    if (isSecondary && !wasSecondaryRef.current) {
      window.history.pushState({ page: 'secondary' }, '');
    }
    wasSecondaryRef.current = isSecondary;
  }, [isChatMode, isVoiceMode]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (isChatMode || isVoiceMode) {
        setIsChatMode(false);
        setIsVoiceMode(false);
        setTranscript('');
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(err) {}
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isChatMode, isVoiceMode]);

  const handleBackButtonClick = () => {
    if (window.history.state && window.history.state.page === 'secondary') {
      window.history.back();
    } else {
      setIsChatMode(false);
      setIsVoiceMode(false);
      setTranscript('');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(err) {}
      }
    }
  };

  return (
    <>
      <main className={`app-main ${isChatMode ? 'chat-mode' : 'fade-in'}`}>
        
        {/* Premium Background Layers */}
        <div className="ambient-background">
          <div className="ambient-colors"></div>
          <div className="ambient-texture"></div>
          <div className="ambient-valley-mask"></div>
        </div>

        {/* Starfield Background */}
        <Starfield isFullScreen={isChatMode || isVoiceMode} />

        {!isLoggedIn ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            {/* Back Button */}
            {(isChatMode || isVoiceMode) && (
              <button 
                className="back-btn fade-in" 
                onClick={handleBackButtonClick}
                aria-label="Go Back"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            )}

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

        {/* Bottom Search Bar (Always acts as a voice button) */}
        {!isVoiceMode && (
          <div className="bottom-bar-container slide-up">
            <div className="search-bar" onClick={handleOpenChat}>
              <span className="placeholder-text">Ask LUCA</span>
            </div>
          </div>
        )}

        {/* Voice Bottom Controls */}
        {isVoiceMode && (
          <div className="voice-container slide-up">
            <div className="voice-bottom-controls">
              <button className="voice-btn" aria-label="Cancel" onClick={handleVoiceCancel}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              
              <div className="voice-glow-btn" ref={buttonRef}>
                <div className="voice-layer" style={{ backgroundColor: '#3b82f6', width: '50px', height: '50px' }}></div>
                <div className="voice-layer" style={{ backgroundColor: '#06b6d4', width: '40px', height: '40px' }}></div>
                <div className="voice-layer" style={{ backgroundColor: '#8b5cf6', width: '55px', height: '55px' }}></div>
                <div className="voice-layer" style={{ backgroundColor: '#ec4899', width: '45px', height: '45px' }}></div>
              </div>
              
              <button className="voice-btn" aria-label="Done" onClick={handleVoiceSuccess}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </div>
          </div>
        )}
        </>
        )}

      </main>

      <PWABadge />
    </>
  );
}

export default App;
