import { useState, useRef, useEffect } from 'react';
import Message from './Message';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    setMessages([{
      type: 'bot',
      content: "Hello! I'm your INGRES Virtual Assistant. Ask me about groundwater data across India.\n\nTry asking: 'Show recharge data for Maharashtra 2024' or 'Punjab water levels'",
      timestamp: new Date()
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 80) + 'px';
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          sessionId: 'user-session-1'
        })
      });

      const data = await response.json();
      
      const botMessage = {
        type: 'bot',
        content: data.reply,
        timestamp: new Date(),
        data: data.rawData,
        queryParams: data.queryParams
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Sorry, I had trouble processing your request. Please try again.',
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) {
    return null;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const hasOnlyWelcomeMessage = messages.length === 1 && !loading;

  return (
    <div style={{ 
      width: '100vw',
      height: '100vh',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Compact Header */}
      <header style={{
        height: '48px',
        width: '100%',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 1rem',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            animation: 'pulse 3s infinite'
          }}>
            🌊
          </div>
          <h1 style={{
            fontSize: isMobile ? '1rem' : '1.1rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%',
            animation: 'gradient 3s ease infinite'
          }}>
            INGRES Assistant
          </h1>
        </div>
      </header>

      {/* Messages Area - Better Centering */}
      <div style={{ 
        width: '100%',
        height: 'calc(100vh - 48px - 75px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Messages Container with Better Centering */}
        <div style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '800px',
          margin: '0 auto',
          padding: isMobile ? '0.5rem' : '1rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          // Center content when only welcome message
          justifyContent: hasOnlyWelcomeMessage ? 'center' : 'flex-start',
          minHeight: hasOnlyWelcomeMessage ? '100%' : 'auto'
        }}>
          
          {/* Welcome Message Centering Wrapper */}
          {hasOnlyWelcomeMessage ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60%',
              textAlign: 'center',
              gap: '2rem'
            }}>
              {/* Welcome Message */}
              <Message message={messages[0]} index={0} />
              
              {/* Suggested Actions */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
                opacity: 0.8,
                animation: 'fadeInUp 1s ease-out 0.5s both'
              }}>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  marginBottom: '0.5rem'
                }}>
                  Try these examples:
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: '0.8rem',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  {[
                    '🌧️ Maharashtra recharge 2024',
                    '💧 Punjab water levels',
                    '📊 Gujarat extraction data',
                    '❓ Help'
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion.split(' ').slice(1).join(' '))}
                      style={{
                        padding: isMobile ? '12px 16px' : '10px 16px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: isMobile ? '0.9rem' : '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        minWidth: isMobile ? '200px' : 'auto',
                        animation: `fadeInUp 0.8s ease-out ${0.7 + idx * 0.1}s both`
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(102, 126, 234, 0.2)';
                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.4)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Normal chat flow
            <>
              {messages.map((msg, idx) => (
                <Message key={idx} message={msg} index={idx} />
              ))}
              
              {/* Typing Indicator */}
              {loading && (
                <div style={{ 
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '1rem',
                  animation: 'fadeInUp 0.3s ease-out'
                }}>
                  <div style={{
                    maxWidth: '80%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: isMobile ? '8px' : '12px'
                  }}>
                    <div style={{
                      width: isMobile ? '28px' : '32px',
                      height: isMobile ? '28px' : '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '14px' : '16px',
                      flexShrink: 0
                    }}>
                      🤖
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '14px',
                      padding: isMobile ? '8px 12px' : '12px 16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[1, 2, 3].map(i => (
                          <div
                            key={i}
                            style={{
                              width: '5px',
                              height: '5px',
                              backgroundColor: '#667eea',
                              borderRadius: '50%',
                              animation: `typing 1.4s ease-in-out ${i * 0.2}s infinite`
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        fontSize: isMobile ? '0.8rem' : '0.85rem'
                      }}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area - Same as before */}
      <div style={{ 
        width: '100%',
        height: '75px',
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: isMobile ? '8px' : '12px',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '800px',
          margin: '0 auto'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '2px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '4px',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 15px rgba(0, 0, 0, 0.1)'
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message INGRES Assistant..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: isMobile ? '0.9rem' : '0.95rem',
                fontFamily: 'inherit',
                resize: 'none',
                minHeight: '18px',
                maxHeight: '60px',
                padding: isMobile ? '8px 12px' : '10px 14px',
                lineHeight: '1.4'
              }}
              onFocus={(e) => {
                e.target.parentElement.style.borderColor = 'rgba(102, 126, 234, 0.4)';
                e.target.parentElement.style.boxShadow = '0 2px 15px rgba(102, 126, 234, 0.15)';
              }}
              onBlur={(e) => {
                e.target.parentElement.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.target.parentElement.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.1)';
              }}
            />
            
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: isMobile ? '28px' : '30px',
                height: isMobile ? '28px' : '30px',
                background: input.trim() && !loading 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                color: '#ffffff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '12px' : '14px',
                transition: 'all 0.3s ease',
                opacity: loading || !input.trim() ? 0.5 : 1,
                margin: '2px',
                flexShrink: 0
              }}
              className="btn-hover"
            >
              {loading ? '⏳' : '↗'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}