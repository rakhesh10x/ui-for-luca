import React, { useState, useRef, useEffect } from 'react';
import Starfield from './components/Starfield';
import LoginPage from './components/LoginPage';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css';

const CAPSULE_WIDTH = 110;
const CAPSULE_HEIGHT = 48;
const SURFACE_SAMPLES = 22;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createLiquidState() {
  return {
    level: 0,
    levelVelocity: 0,
    glow: 0,
    glowVelocity: 0,
    holdUntil: 0,
    flow: 0,
    drift: 0,
    lastTime: 0,
    blobs: [
      { offset: 0.08, speed: 0.62, depth: 0.26, size: 0.9, phase: 0.2 },
      { offset: 0.33, speed: 0.44, depth: 0.44, size: 1.1, phase: 1.4 },
      { offset: 0.56, speed: 0.71, depth: 0.58, size: 0.85, phase: 2.4 },
      { offset: 0.78, speed: 0.53, depth: 0.37, size: 1.0, phase: 3.1 }
    ]
  };
}

function stepSpring(state, key, velocityKey, target, tension, damping, dt) {
  const force = (target - state[key]) * tension;
  state[velocityKey] += force * dt;
  state[velocityKey] *= Math.exp(-damping * dt);
  state[key] += state[velocityKey] * dt;
}

function resizeCapsuleCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(CAPSULE_WIDTH * ratio) || canvas.height !== Math.round(CAPSULE_HEIGHT * ratio)) {
    canvas.width = Math.round(CAPSULE_WIDTH * ratio);
    canvas.height = Math.round(CAPSULE_HEIGHT * ratio);
  }
  return ratio;
}

function drawRoundedPath(ctx, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(width, 0, width, height, radius);
  ctx.arcTo(width, height, 0, height, radius);
  ctx.arcTo(0, height, 0, 0, radius);
  ctx.arcTo(0, 0, width, 0, radius);
  ctx.closePath();
}

function drawLiquidCapsule(canvas, state) {
  if (!canvas) {
    return;
  }

  const ratio = resizeCapsuleCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const width = CAPSULE_WIDTH;
  const height = CAPSULE_HEIGHT;
  const radius = height / 2;
  const glow = clamp(state.glow, 0, 1);
  const phase = state.flow;
  const drift = state.drift;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(ratio, ratio);

  ctx.save();
  drawRoundedPath(ctx, width, height, radius);
  ctx.clip();

  const backdrop = ctx.createLinearGradient(0, 0, 0, height);
  backdrop.addColorStop(0, 'rgba(4, 6, 12, 1)');
  backdrop.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${8 + (glow * 6)}px)`;

  const drawAuroraBlob = (cx, cy, rx, ry, r, g, b, alpha) => {
    ctx.beginPath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Base subtle idle glow at the very bottom
  const idleAlpha = 0.15 + (glow * 0.4);
  drawAuroraBlob(width * 0.5, height * 0.9, width * 0.6, height * 0.5, 60, 100, 255, idleAlpha);

  const activeAlpha = 0.05 + (glow * 0.65);
  
  // Blob 1: Purple/Indigo, moves left/right and up
  const cx1 = width * 0.3 + Math.sin(phase * 1.2) * width * 0.2;
  const cy1 = height * 0.9 - (glow * height * 0.5) + Math.cos(drift * 1.5) * 3;
  const rx1 = width * 0.4 + (glow * width * 0.2);
  const ry1 = height * 0.3 + (glow * height * 0.4);
  drawAuroraBlob(cx1, cy1, rx1, ry1, 140, 60, 255, activeAlpha);

  // Blob 2: Faint Cyan/Light Blue
  const cx2 = width * 0.7 + Math.sin(phase * 0.9 + 2) * width * 0.2;
  const cy2 = height * 0.9 - (glow * height * 0.6) + Math.cos(drift * 1.1 + 1) * 3;
  const rx2 = width * 0.35 + (glow * width * 0.3);
  const ry2 = height * 0.25 + (glow * height * 0.5);
  drawAuroraBlob(cx2, cy2, rx2, ry2, 80, 180, 255, activeAlpha * 0.8);

  // Blob 3: Deep Blue center
  const cx3 = width * 0.5 + Math.sin(phase * 1.5 + 4) * width * 0.1;
  const cy3 = height * 0.95 - (glow * height * 0.4);
  const rx3 = width * 0.5 + (glow * width * 0.2);
  const ry3 = height * 0.3 + (glow * height * 0.3);
  drawAuroraBlob(cx3, cy3, rx3, ry3, 40, 80, 255, activeAlpha);

  ctx.restore();
  ctx.restore();
}

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
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);
  const liquidStateRef = useRef(createLiquidState());

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
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.08;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          const timeData = new Float32Array(analyser.fftSize);
          const liquidState = liquidStateRef.current;
          liquidState.lastTime = 0;

          const renderFrame = () => {
            const now = performance.now();
            const dt = liquidState.lastTime ? Math.min((now - liquidState.lastTime) / 1000, 0.04) : (1 / 60);
            liquidState.lastTime = now;

            analyser.getByteFrequencyData(frequencyData);
            
            // 1. Get real microphone volume
            let sum = 0;
            // Only average the first 100 bins (lower frequencies where voice lives)
            // to prevent high-frequency silence from dragging down the average.
            const voiceBins = 100; 
            for (let i = 0; i < voiceBins; i++) {
              sum += frequencyData[i];
            }
            const average = sum / voiceBins;
            
            // Boost sensitivity. Normal speech average is around 20-40.
            const rawVolume = Math.min(average / 40, 1);

            // 2. Smooth it with a low-pass filter EXACTLY as requested:
            // smoothedVolume += (rawVolume - smoothedVolume) * 0.03
            liquidState.level += (rawVolume - liquidState.level) * 0.03;
            
            // Link glow directly to the smoothed volume
            liquidState.glow = Math.min(liquidState.level * 1.2, 1);

            // 3. Use smoothed volume to control speed
            // When idle (level=0), it should move extremely slowly (0.01)
            // When shouting (level=1), it hits 0.6 (calm but active)
            liquidState.flow += dt * (0.01 + (liquidState.level * 0.6));
            liquidState.drift += dt * (0.005 + (liquidState.glow * 0.5));

            if (buttonRef.current) {
              buttonRef.current.style.boxShadow = `0 0 ${14 + (liquidState.glow * 20)}px rgba(71, 118, 255, ${0.08 + (liquidState.glow * 0.22)}), 0 10px 24px rgba(0, 0, 0, 0.45)`;
            }

            drawLiquidCapsule(canvasRef.current, liquidState);
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          };

          drawLiquidCapsule(canvasRef.current, liquidState);
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
      liquidStateRef.current = createLiquidState();
      drawLiquidCapsule(canvasRef.current, liquidStateRef.current);
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

  useEffect(() => {
    drawLiquidCapsule(canvasRef.current, liquidStateRef.current);
  }, []);

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

            {/* Logo Container for Home Page Only */}
            {!isChatMode && !isVoiceMode && (
              <div className="logo-container fade-in">
                <img src="logo.png?v=3" alt="LUCA Logo" className="app-logo" />
              </div>
            )}

            {/* Center Content for Home and Voice Mode */}
        {(!isChatMode || isVoiceMode) && (
          <div className="center-content">
            {!isChatMode && !isVoiceMode && (
              <img src="Eyes_of_LUCA-removebg-preview.png?v=2" alt="Eyes of LUCA" className="eyes-logo fade-in" />
            )}
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
                <canvas
                  ref={canvasRef}
                  className="liquid-canvas"
                  width={CAPSULE_WIDTH}
                  height={CAPSULE_HEIGHT}
                  aria-hidden="true"
                />
                <div className="voice-capsule-glass"></div>
                <div className="voice-capsule-rim"></div>
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
