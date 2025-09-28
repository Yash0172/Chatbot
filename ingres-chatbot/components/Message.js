export default function Message({ message, index }) {
  const isBot = message.type === 'bot';
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div style={{
      width: '100%',
      marginBottom: isMobile ? '0.8rem' : '1rem',
      animation: `${isBot ? 'slideIn' : 'slideInRight'} 0.5s ease-out ${index * 0.1}s both`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: isMobile ? '8px' : '12px',
        maxWidth: '100%'
      }}>
        
        {/* Responsive Avatar */}
        <div style={{
          width: isMobile ? '28px' : '32px',
          height: isMobile ? '28px' : '32px',
          borderRadius: '50%',
          background: isBot 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '14px' : '16px',
          flexShrink: 0,
          boxShadow: isBot 
            ? '0 2px 10px rgba(102, 126, 234, 0.3)'
            : '0 2px 10px rgba(245, 87, 108, 0.3)'
        }}>
          {isBot ? '🤖' : '👤'}
        </div>

        {/* Message Content */}
        <div style={{
          flex: 1,
          minWidth: 0
        }}>
          {/* Message Bubble */}
          <div style={{
            background: isBot 
              ? 'rgba(255, 255, 255, 0.08)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? '10px 12px' : '12px 16px',
            borderRadius: '14px',
            color: '#ffffff',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: isBot ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isBot 
              ? '0 2px 10px rgba(0, 0, 0, 0.1)'
              : '0 2px 10px rgba(102, 126, 234, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            fontSize: isMobile ? '0.85rem' : '0.9rem',
            lineHeight: '1.5'
          }}>
            
            {/* Background Pattern for Bot Messages */}
            {isBot && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="12.5" cy="12.5" r="1"/%3E%3C/g%3E%3C/svg%3E")',
                opacity: 0.3,
                zIndex: 0
              }}></div>
            )}
            
            {/* Content */}
            <div style={{
              position: 'relative',
              zIndex: 1
            }}>
              {message.content}
            </div>
          </div>
          
          {/* Timestamp */}
          <div style={{
            fontSize: isMobile ? '0.65rem' : '0.7rem',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '3px',
            marginLeft: '4px'
          }}>
            {message.timestamp ? message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }) : ''}
          </div>
        </div>
      </div>
    </div>
  );
}