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
  const baseY = height * (0.67 - (level * 0.13));
  const amplitude = 1.15 + (level * 4.8);
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

  const glowGradient = ctx.createRadialGradient(width * 0.5, height * 0.74, 4, width * 0.5, height * 0.74, width * 0.48);
  glowGradient.addColorStop(0, `rgba(115, 168, 255, ${0.08 + (glow * 0.14)})`);
  glowGradient.addColorStop(0.55, `rgba(58, 104, 255, ${0.11 + (glow * 0.14)})`);
  glowGradient.addColorStop(1, 'rgba(9, 14, 38, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);

  const surfacePoints = [];
  for (let index = 0; index <= SURFACE_SAMPLES; index += 1) {
    const t = index / SURFACE_SAMPLES;
    const x = t * width;
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.72);
    const slowWave = Math.sin((t * Math.PI * 1.85) - (phase * 1.7) + 0.35);
    const midWave = Math.sin((t * Math.PI * 3.2) - (phase * 2.85) + 1.1);
    const detailWave = Math.sin((t * Math.PI * 5.2) - (phase * 4.4) + 2.5);
    const tilt = Math.sin((phase * 0.78) + drift) * (t - 0.5) * level * 4.5;
    const wave = ((slowWave * 0.62) + (midWave * 0.28) + (detailWave * 0.1)) * envelope;
    surfacePoints.push({
      x,
      y: baseY - (wave * amplitude) - tilt
    });
  }

  ctx.save();
  ctx.filter = `blur(${5 + (glow * 8)}px)`;
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
  const softFill = ctx.createLinearGradient(0, baseY - 10, 0, height);
  softFill.addColorStop(0, `rgba(224, 239, 255, ${0.2 + (glow * 0.16)})`);
  softFill.addColorStop(0.28, `rgba(99, 153, 255, ${0.3 + (glow * 0.18)})`);
  softFill.addColorStop(1, `rgba(20, 48, 170, ${0.55 + (glow * 0.14)})`);
  ctx.fillStyle = softFill;
  ctx.fill();
  ctx.restore();

  for (const blob of state.blobs) {
    const travel = (blob.offset + (phase * blob.speed * 0.08)) % 1;
    const x = travel * width;
    const y = baseY + ((height - baseY) * (0.16 + (blob.depth * 0.72)));
    const radiusX = 20 + (blob.size * 12) + (glow * 12);
    const radiusY = 8 + (blob.size * 5) + (glow * 5);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = `blur(${8 + (blob.size * 4)}px)`;
    ctx.translate(x, y);
    ctx.scale(1 + (level * 0.18), 1);
    const blobGradient = ctx.createRadialGradient(0, -radiusY * 0.3, 2, 0, 0, radiusX);
    blobGradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 + (glow * 0.14)})`);
    blobGradient.addColorStop(0.42, `rgba(147, 199, 255, ${0.11 + (glow * 0.18)})`);
    blobGradient.addColorStop(1, 'rgba(26, 64, 216, 0)');
    ctx.fillStyle = blobGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, Math.sin(phase + blob.phase) * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

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

  const liquidFill = ctx.createLinearGradient(0, baseY - 12, 0, height);
  liquidFill.addColorStop(0, `rgba(246, 250, 255, ${0.5 + (glow * 0.1)})`);
  liquidFill.addColorStop(0.12, `rgba(182, 217, 255, ${0.66 + (glow * 0.08)})`);
  liquidFill.addColorStop(0.4, `rgba(92, 150, 255, ${0.8 + (glow * 0.06)})`);
  liquidFill.addColorStop(1, 'rgba(18, 45, 170, 0.96)');
  ctx.fillStyle = liquidFill;
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + (glow * 0.18)})`;
  ctx.lineWidth = 1.4;
  ctx.filter = `blur(${1.4 + (glow * 1.6)}px)`;
  ctx.beginPath();
  ctx.moveTo(surfacePoints[0].x, surfacePoints[0].y);
  for (let index = 1; index < surfacePoints.length; index += 1) {
    const prev = surfacePoints[index - 1];
    const current = surfacePoints[index];
    const midX = (prev.x + current.x) / 2;
    const midY = (prev.y + current.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  ctx.stroke();
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
          let waveTime = 0; // Custom time accumulator for variable speed

          const renderFrame = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const rawVolume = Math.min(average / 100, 1);

            // In the video, the swell is very slow to rise and EXTREMELY slow to fall
            if (rawVolume > smoothedVolume) {
              smoothedVolume += (rawVolume - smoothedVolume) * 0.08; // Smooth rise
            } else {
              smoothedVolume += (rawVolume - smoothedVolume) * 0.015; // Very heavy damping for slow decay
            }

            // Time flow is very slow, creating a "breathing" effect rather than flowing water
            waveTime += 0.01 + (smoothedVolume * 0.02);

            if (buttonRef.current) {
              // Generate SVG Paths for the waves
              const paths = buttonRef.current.querySelectorAll('path');
              if (paths.length === 4) { // Use 4 layers for rich, blended plasma
                const width = 140;
                const height = 64;
                
                // Dynamic water level: Idle is very low, speaking rises smoothly
                const baseY = 58 - (smoothedVolume * 20); 
                
                // Frequencies set for 1-2 gentle curves across the pill
                const waves = [
                  { speedMult: 1.0, freq: 0.05, ampMult: 1.0, offset: 0 },
                  { speedMult: 0.8, freq: 0.06, ampMult: 0.8, offset: 2.0 },
                  { speedMult: 1.2, freq: 0.04, ampMult: 1.2, offset: 4.0 },
                  { speedMult: 0.9, freq: 0.07, ampMult: 0.9, offset: 1.0 }
                ];

                waves.forEach((wave, i) => {
                  let d = `M 0 ${height} `;
                  
                  // Gentle amplitude so it looks like swells, not mountains
                  const amplitude = 1.5 + (smoothedVolume * 8 * wave.ampMult);
                  
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
              buttonRef.current.style.boxShadow = `0 -2px ${10 + smoothedVolume*25}px rgba(40, 150, 255, ${0.1 + smoothedVolume*0.4})`;
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
                      <stop offset="40%" stopColor="rgba(60, 180, 255, 0.8)" />
                      <stop offset="100%" stopColor="rgba(10, 40, 150, 0.9)" />
                    </linearGradient>
                    <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(200, 240, 255, 0.8)" />
                      <stop offset="50%" stopColor="rgba(80, 150, 255, 0.7)" />
                      <stop offset="100%" stopColor="rgba(20, 50, 160, 0.9)" />
                    </linearGradient>
                  </defs>
                  {/* Heavy blur to create a soft, misty plasma flow */}
                  <path fill="url(#waveGrad1)" opacity="0.6" style={{ filter: 'blur(10px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad2)" opacity="0.7" style={{ filter: 'blur(8px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad1)" opacity="0.8" style={{ filter: 'blur(6px)', mixBlendMode: 'screen' }} />
                  <path fill="url(#waveGrad2)" opacity="0.9" style={{ filter: 'blur(4px)', mixBlendMode: 'screen' }} />
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
