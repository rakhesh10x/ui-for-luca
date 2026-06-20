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

          // Spring physics for volume
          let smoothedVolume = 0;
          let peakVolume = 0;
          let peakHoldTime = 0;
          let waveTime = 0; // Custom time accumulator for variable speed

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
              peakHoldTime = 10;
            } else if (peakHoldTime > 0) {
              peakHoldTime--;
            } else {
              peakVolume += (rawVolume - peakVolume) * 0.05;
            }

            // Smooth volume (gradual calm down)
            if (peakVolume > smoothedVolume) {
              smoothedVolume += (peakVolume - smoothedVolume) * 0.4;
            } else {
              smoothedVolume += (peakVolume - smoothedVolume) * 0.08;
            }

            // Wave speed increases with volume
            waveTime += 0.03 + (smoothedVolume * 0.06);

            if (buttonRef.current) {
              // Generate SVG Paths for the waves
              const paths = buttonRef.current.querySelectorAll('path');
              if (paths.length === 5) {
                const width = 140;
                const height = 64;
                
                // Dynamic water level: 
                // Idle = 52 (bottom 20%), Speaking = 34 (bottom 50%)
                const baseY = 52 - (smoothedVolume * 18); 
                
                // Keep frequency low for gentle swells, not mountains
                const waves = [
                  { speedMult: 1.5, freq: 0.02, ampMult: 0.8, offset: 0 },
                  { speedMult: 1.0, freq: 0.03, ampMult: 1.0, offset: 2.0 },
                  { speedMult: 2.0, freq: 0.04, ampMult: 0.6, offset: 4.0 },
                  { speedMult: 1.2, freq: 0.025, ampMult: 1.2, offset: 1.0 },
                  { speedMult: 0.8, freq: 0.035, ampMult: 0.9, offset: 3.0 }
                ];

                waves.forEach((wave, i) => {
                  let d = `M 0 ${height} `;
                  
                  // Amplitude: Idle = 1.0 (flat), Speaking = 7 (smooth rolling waves)
                  const amplitude = 1.0 + (smoothedVolume * 6 * wave.ampMult);
                  
                  // Calculate points across the X axis
                  for (let x = 0; x <= width; x += 5) {
                    const y = baseY - Math.sin(x * wave.freq + waveTime * wave.speedMult + wave.offset) * amplitude;
                    d += `L ${x} ${y} `;
                  }
                  
                  d += `L ${width} ${height} Z`;
                  paths[i].setAttribute('d', d);
                });
              }

              // Dynamic glow behind the pill
              buttonRef.current.style.boxShadow = `0 -2px ${10 + smoothedVolume*20}px rgba(40, 100, 255, ${0.1 + smoothedVolume*0.3})`;
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
                <svg className="wave-svg" width="140" height="64" viewBox="0 0 140 64" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                      <stop offset="30%" stopColor="rgba(40, 100, 255, 0.8)" />
                      <stop offset="100%" stopColor="rgba(10, 30, 150, 0.9)" />
                    </linearGradient>
                    <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.7)" />
                      <stop offset="40%" stopColor="rgba(50, 120, 255, 0.7)" />
                      <stop offset="100%" stopColor="rgba(15, 40, 160, 0.9)" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#waveGrad1)" opacity="0.5" style={{ filter: 'blur(8px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad2)" opacity="0.6" style={{ filter: 'blur(6px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad1)" opacity="0.7" style={{ filter: 'blur(5px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad2)" opacity="0.8" style={{ filter: 'blur(4px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad1)" opacity="0.9" style={{ filter: 'blur(3px)', mixBlendMode: 'screen' }} />
                </svg>
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
