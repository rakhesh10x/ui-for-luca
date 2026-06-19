import React, { useState, useRef, useEffect } from 'react';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css';

function App() {
  const [isChatMode, setIsChatMode] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'user' | 'ai'
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [typedTranscript, setTypedTranscript] = useState('');
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const buttonRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);
  const voiceStateRef = useRef(voiceState);
  const silenceTimerRef = useRef(Date.now());
  const aiTimeoutRef = useRef(null);
  const typingIntervalRef = useRef(null);

  // Sync voiceState to ref for requestAnimationFrame access
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

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

          const renderFrame = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volume = Math.min(average / 100, 1);

            if (buttonRef.current) {
              const time = Date.now() / 1000;
              const currentVoiceState = voiceStateRef.current;
              
              if (currentVoiceState === 'ai') {
                const aiPulse = (Math.sin(time * 8) + 1) / 2;
                const scale = 1.05 + (aiPulse * 0.1);
                const spread = 30 + (aiPulse * 20);
                buttonRef.current.style.transform = `scale(${scale})`;
                buttonRef.current.style.boxShadow = `inset 0 -10px 40px rgba(0, 200, 150, 0.8), 0 0 ${spread}px rgba(0, 229, 255, 0.8)`;
                buttonRef.current.style.setProperty('--volume-opacity', 1);
              } else {
                if (volume > 0.05) {
                  if (currentVoiceState === 'idle') setVoiceState('user');
                  silenceTimerRef.current = Date.now();
                } else {
                  if (currentVoiceState === 'user' && Date.now() - silenceTimerRef.current > 1500) {
                    setVoiceState('idle');
                  }
                }
                const idleSine = (Math.sin(time * 2.5) + 1) / 2;
                
                const scale = Math.max(1 + (idleSine * 0.05), 1 + (volume * 0.15));
                const opacity = Math.max(0.3 + (idleSine * 0.2), 0.3 + (volume * 0.7));
                const spread = Math.max(20 + (idleSine * 10), 20 + (volume * 50));
                
                buttonRef.current.style.transform = `scale(${scale})`;
                buttonRef.current.style.boxShadow = `inset 0 -10px ${20 + volume*20}px rgba(81, 45, 168, ${0.4 + volume*0.4}), 0 0 ${spread}px rgba(63, 81, 181, ${0.4 + volume*0.5})`;
                buttonRef.current.style.setProperty('--volume-opacity', opacity);
              }
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
    setVoiceState('idle');
  };

  const startProgressiveTyping = (fullText) => {
    let index = 0;
    setTypedTranscript('');
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    typingIntervalRef.current = setInterval(() => {
      index++;
      setTypedTranscript(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(typingIntervalRef.current);
        aiTimeoutRef.current = setTimeout(() => {
          setIsVoiceMode(false);
          setVoiceState('idle');
          setMessages(prev => [
            ...prev, 
            { role: 'user', content: fullText },
            { role: 'ai', content: "Got it! I am processing your voice request." }
          ]);
          setLastTranscript('');
          setTypedTranscript('');
        }, 500);
      }
    }, 40);
  };

  const handleVoiceSuccess = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setVoiceState('ai');
    
    const finalMessage = transcript.trim() ? transcript : "Hello LUCA! How are you doing today?";
    setLastTranscript(finalMessage);
    setTranscript('');

    startProgressiveTyping(finalMessage);
  };

  const handleInterrupt = () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    
    setVoiceState('idle');
    setLastTranscript('');
    setTypedTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch(e){}
    }
  };

  const handleVoiceCancel = () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    
    setIsVoiceMode(false);
    setVoiceState('idle');
    setTranscript('');
    setLastTranscript('');
    setTypedTranscript('');
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <main className={`app-main ${isChatMode ? 'chat-mode' : 'fade-in'}`}>
        
        {/* Premium Background Layers */}
        <div className="ambient-background">
          <div className="ambient-colors"></div>
          <div className="ambient-texture"></div>
          <div className="ambient-valley-mask"></div>
        </div>

        {/* Top Area Cleaned */}

        {/* Center Content for Home and Voice Mode */}
        {(!isChatMode || isVoiceMode) && (
          <div className="center-content">
            {/* Logo removed as requested */}
            <h1 className="welcome-text fade-in-text">
              {isVoiceMode ? (
                voiceState === 'ai' ? 'Speaking...' : 
                voiceState === 'user' ? (transcript || 'Listening...') : 
                'Listening...'
              ) : 'Welcome'}
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
              <span className="placeholder-text" style={{ marginLeft: '1rem' }}>Ask LUCA</span>
              
              <button type="button" className="icon-btn mic-btn" aria-label="Voice input">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Voice Bottom Controls */}
        {isVoiceMode && (
          <div className="voice-container slide-up">
            {voiceState === 'ai' && (
              <div className="ai-voice-ui">
                <div className="live-transcript-bubble">
                  {typedTranscript}
                </div>
                <button className="interrupt-pill" onClick={handleInterrupt}>
                  Tap to interrupt
                </button>
              </div>
            )}
            
            <div className="voice-bottom-controls">
              {voiceState !== 'ai' && (
                <button className="voice-btn" aria-label="Cancel" onClick={handleVoiceCancel}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
              
              <div className={`voice-glow-btn ${voiceState === 'ai' ? 'ai-active' : ''}`} ref={buttonRef}></div>
              
              {voiceState !== 'ai' && (
                <button className="voice-btn" aria-label="Done" onClick={handleVoiceSuccess}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              )}
            </div>
          </div>
        )}

      </main>

      <PWABadge />
    </>
  );
}

export default App;
