import React, { useRef, useState, useEffect } from 'react';
import { FiMic, FiStopCircle, FiCheck, FiX } from 'react-icons/fi';

const SpeechToTextProduction = ({ onResult, language = 'rw' }) => {
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);

  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);
  const rawAudioRef = useRef([]);

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      audioChunksRef.current = [];
      rawAudioRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio context for visualization AND raw audio capture
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();

      // Create a script processor to capture raw audio data
      const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        rawAudioRef.current.push(...Array.from(inputData));
      };

      source.connect(analyserRef.current);
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextRef.current.destination);

      // Setup media recorder for fallback
      const mimeType = 'audio/webm;codecs=opus';
      const options = { mimeType };

      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        scriptProcessor.disconnect();
        analyserRef.current.disconnect();
        await sendAudioToServer();
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      setRecordingTime(0);

      // Timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Visualize audio levels
      visualizeAudio();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
      console.error('Recording error:', err);
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(average / 2.55, 100));

    if (isListening) {
      requestAnimationFrame(visualizeAudio);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(true);
    }
  };

  const sendAudioToServer = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const rawAudioData = rawAudioRef.current;

      if (audioBlob.size === 0 && rawAudioData.length === 0) {
        setError('No audio recorded. Please try again.');
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language);
      formData.append('rawAudio', JSON.stringify(rawAudioData.slice(0, 160000))); // ~5s at 16kHz

      const response = await fetch('/api/speech/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.recognized_text) {
        setResult({
          text: data.recognized_text,
          command: data.command,
          confidence: data.confidence || 0,
          alternatives: data.alternatives || [],
        });

        setConfidence(data.confidence || 0);

        if (onResult) {
          onResult({
            text: data.recognized_text,
            command: data.command,
            confidence: data.confidence,
            language: language,
          });
        }
      } else {
        setError(data.message || 'Failed to recognize speech. Please try again.');
      }
    } catch (err) {
      console.error('API error:', err);
      setError('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
      {/* Recording Status */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-brand-950 mb-2">
          {language === 'rw' ? 'Menya Kinyarwanda' : 'Speak English'}
        </h3>
        <p className="text-sm text-brand-700">
          {isListening
            ? `Recording... ${recordingTime}s`
            : isProcessing
            ? 'Processing audio...'
            : 'Click to start speaking'}
        </p>
      </div>

      {/* Audio Level Visualizer */}
      {isListening && (
        <div className="mb-6">
          <div className="w-full h-2 bg-brand-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-100"
              style={{ width: `${audioLevel}%` }}
            />
          </div>
          <p className="text-xs text-brand-600 text-center mt-2">Audio Level: {Math.round(audioLevel)}%</p>
        </div>
      )}

      {/* Record Button */}
      <div className="flex justify-center gap-4 mb-6">
        {!isListening && !isProcessing ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            <FiMic size={20} />
            Start Recording
          </button>
        ) : isListening ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            <FiStopCircle size={20} />
            Stop Recording
          </button>
        ) : null}
      </div>

      {/* Processing Spinner */}
      {isProcessing && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin">
            <FiMic className="text-brand-500" size={32} />
          </div>
          <p className="text-sm text-brand-700 mt-3">Analyzing your speech...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <FiCheck className="text-green-600" size={20} />
            <span className="font-bold text-green-900">Recognized:</span>
          </div>
          <p className="text-lg font-bold text-brand-950 mb-2">{result.text}</p>
          <p className="text-sm text-brand-700 mb-3">
            Confidence: <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
          </p>

          {result.alternatives && result.alternatives.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-sm font-medium text-brand-700 mb-2">Other possibilities:</p>
              <ul className="space-y-1">
                {result.alternatives.slice(0, 3).map((alt, idx) => (
                  <li key={idx} className="text-sm text-brand-600">
                    {alt.text} ({(alt.confidence * 100).toFixed(1)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <FiX className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Language Badge */}
      <div className="text-center mt-6">
        <span className="text-xs px-3 py-1 bg-brand-100 text-brand-700 rounded-full font-medium">
          {language === 'rw' ? 'Kinyarwanda' : 'English'}
        </span>
      </div>
    </div>
  );
};

export default SpeechToTextProduction;
