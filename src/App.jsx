import React, { useState, useRef, useEffect } from 'react';
import Starfield from './components/Starfield';
import LoginPage from './components/LoginPage';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css';

const CAPSULE_WIDTH = 164;
const CAPSULE_HEIGHT = 72;
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
  const level = clamp(state.level, 0, 1);
  const glow = clamp(state.glow, 0, 1);
  const baseY = height * (0.85 - (level * 0.15));
  const amplitude = 1.0 + (level * 3.5);
  const phase = state.flow;
  const drift = state.drift;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(ratio, ratio);

  ctx.save();
  drawRoundedPath(ctx, width, height, radius);
  ctx.clip();

  const backdrop = ctx.createLinearGradient(0, 0, 0, height);
  backdrop.addColorStop(0, 'rgba(4, 6, 12, 0.96)');
  backdrop.addColorStop(0.5, 'rgba(3, 5, 12, 0.98)');
  backdrop.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);


  const surfacePoints = [];
  for (let index = 0; index <= SURFACE_SAMPLES; index += 1) {
    const t = index / SURFACE_SAMPLES;
    const x = t * width;
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.72);
    // Single wide rolling mound, thick fluid
    const slowWave = Math.sin((t * Math.PI * 1.5) - (phase * 1.5));
    const midWave = Math.sin((t * Math.PI * 2.5) - (phase * 2.0)) * 0.15;
    const wave = (slowWave + midWave) * envelope;
    surfacePoints.push({
      x,
      y: baseY - (wave * amplitude)
    });
  }

  ctx.save();
  ctx.filter = `blur(${12 + (glow * 10)}px)`;
  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(surfacePoints[0].x, surfacePoints[0].y + 3);
  for (let index = 1; index < surfacePoints.length; index += 1) {
    const prev = surfacePoints[index - 1];
    const current = surfacePoints[index];
    const midX = (prev.x + current.x) / 2;
    const midY = (prev.y + current.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y + 3, midX, midY + 2);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  const softFill = ctx.createLinearGradient(0, baseY - 20, 0, height);
  softFill.addColorStop(0, `rgba(224, 239, 255, 0)`);
  softFill.addColorStop(0.3, `rgba(99, 153, 255, ${0.1 + (glow * 0.3)})`);
  softFill.addColorStop(1, `rgba(20, 48, 170, ${0.3 + (glow * 0.5)})`);
  ctx.fillStyle = softFill;
  ctx.fill();
  ctx.restore();



  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(surfacePoints[0].x, surfacePoints[0].y);
  for (let index = 1; index < surfacePoints.length; index += 1) {
    const prev = surfacePoints[index - 1];
    const current = surfacePoints[index];
    const midX = (prev.x + current.x) / 2;
    const midY = (prev.y + current.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  ctx.lineTo(width, height);
  ctx.closePath();

  const liquidFill = ctx.createLinearGradient(0, baseY - 15, 0, height);
  liquidFill.addColorStop(0, `rgba(246, 250, 255, 0)`);
  liquidFill.addColorStop(0.2, `rgba(182, 217, 255, ${0.2 + (glow * 0.4)})`);
  liquidFill.addColorStop(0.5, `rgba(92, 150, 255, ${0.4 + (glow * 0.5)})`);
  liquidFill.addColorStop(1, `rgba(18, 45, 170, ${0.8 + (glow * 0.2)})`);
  ctx.fillStyle = liquidFill;
  ctx.fill();

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
