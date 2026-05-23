import React, { useState, useRef, useEffect } from 'react';
import t from '../utils/translations';
import './SpeechToText.css';

const SpeechToText = ({ onResult, language = 'en', showTopResults = false, autoSearch = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [topResults, setTopResults] = useState([]);
  const [error, setError] = useState('');
  const [confidence, setConfidence] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const { t: translate } = { t: (key) => t[language]?.[key] ?? t['en']?.[key] ?? key };

  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startListening = async () => {
    try {
      setError('');
      setRecognizedText('');
      setTopResults([]);
      chunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/wav' });
        await sendAudioToServer(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.current.start();
      setIsListening(true);
    } catch (err) {
      setError('Microphone access denied or unavailable');
      console.error('Microphone error:', err);
    }
  };

  const stopListening = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsListening(false);
    }
  };

  const sendAudioToServer = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('language', language);

      const endpoint = showTopResults ? '/api/speech/recognize-multiple' : '/api/speech/recognize';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Speech recognition failed');
      }

      const data = await response.json();

      if (data.success) {
        if (showTopResults && data.data?.results) {
          setTopResults(data.data.results);
          const topResult = data.data.results[0];
          if (topResult) {
            setRecognizedText(topResult.command);
            setConfidence(topResult.confidence);
            if (onResult) onResult(topResult.command, topResult.confidence);
            if (autoSearch) window.location.href = `/search?q=${encodeURIComponent(topResult.command)}&lang=${language}`;
          }
        } else {
          setRecognizedText(data.data?.text || '');
          setConfidence(data.data?.confidence || 0);
          if (onResult) onResult(data.data?.text, data.data?.confidence);
          if (autoSearch) window.location.href = `/search?q=${encodeURIComponent(data.data?.text)}&lang=${language}`;
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to process audio');
      console.error('Server error:', err);
    }
  };

  return (
    <div className="stt-container">
      <div className="stt-button-group">
        <button
          className={`stt-button ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
          title={translate(isListening ? 'listeningSpeak' : 'tapMicSpeak')}
        >
          <span className="mic-icon">🎤</span>
          {isListening && <span className="listening-indicator"></span>}
        </button>
      </div>

      {isListening && (
        <div className="stt-status listening-status">{translate('listeningSpeak')}</div>
      )}

      {error && <div className="stt-error">{error}</div>}

      {recognizedText && (
        <div className="stt-result">
          <div className="result-label">{translate('youSaid')}:</div>
          <div className="result-text">{recognizedText}</div>
          {confidence > 0 && (
            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: `${confidence * 100}%` }}></div>
              <span className="confidence-text">{Math.round(confidence * 100)}%</span>
            </div>
          )}
          {!autoSearch && recognizedText && (
            <button
              className="search-button"
              onClick={() => {
                if (onResult) onResult(recognizedText, confidence);
              }}
            >
              {translate('searchForThis')}
            </button>
          )}
        </div>
      )}

      {showTopResults && topResults.length > 0 && (
        <div className="stt-alternatives">
          <div className="alternatives-label">Other possibilities:</div>
          <div className="alternatives-list">
            {topResults.slice(1).map((result, idx) => (
              <button
                key={idx}
                className="alternative-item"
                onClick={() => {
                  setRecognizedText(result.command);
                  setConfidence(result.confidence);
                  if (onResult) onResult(result.command, result.confidence);
                }}
              >
                <span className="alt-text">{result.command}</span>
                <span className="alt-confidence">{Math.round(result.confidence * 100)}%</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechToText;
