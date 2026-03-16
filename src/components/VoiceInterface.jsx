import React, { useState } from 'react'
import './VoiceInterface.css'

function VoiceInterface({ listening, loading, error, transcript, onConnect, onDisconnect }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`voice-interface-floating ${isExpanded ? 'expanded' : ''}`}>
      {/* Compact Avatar Button */}
      <div 
        className={`voice-avatar ${listening ? 'listening' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        {listening && <div className="pulse-ring"></div>}
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="voice-panel">
          {/* Status */}
          <div className="voice-status">
            {loading && 'Bağlanıyor...'}
            {listening && !loading && '🎧 Dinliyorum'}
            {!listening && !loading && 'Sesli Asistan'}
            {error && `❌ ${error}`}
          </div>

          {/* Connect/Disconnect Button */}
          <button
            className={`btn-voice-compact ${listening ? 'btn-disconnect' : 'btn-connect'}`}
            onClick={listening ? onDisconnect : onConnect}
            disabled={loading}
          >
            {loading && <span className="spinner"></span>}
            {!loading && (listening ? '⏹️ Durdur' : '🎤 Başlat')}
          </button>

          {/* Mini Transcript */}
          {transcript.length > 0 && (
            <div className="mini-transcript">
              {transcript.slice(-3).map((item, index) => (
                <div key={index} className={`mini-item ${item.role}`}>
                  {item.role === 'user' ? '👤' : '🤖'} {item.text.substring(0, 50)}...
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VoiceInterface
