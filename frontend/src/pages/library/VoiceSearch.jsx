import { Mic, Search, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as voiceApi from '../../api/voiceSearch.js';
import AIModelStatus from '../../components/AIModelStatus.jsx';
import BookCard from '../../components/BookCard.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function VoiceSearch() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [manualTranscript, setManualTranscript] = useState('');
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function submitPayload(payload) {
    setStatus('processing');
    setError('');
    try {
      const response = await voiceApi.sendVoiceSearch(payload);
      setResult(response.data);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Your browser does not support audio recording. Type a search phrase instead.');
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        clearTimeout(timeoutRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!audio.size) {
          setError('No audio was captured. Check the microphone and try again.');
          setStatus('idle');
          return;
        }
        const payload = new FormData();
        payload.append('audio', audio, 'voice-search.webm');
        await submitPayload(payload);
      };
      recorder.start();
      timeoutRef.current = setTimeout(() => recorder.state === 'recording' && recorder.stop(), 5000);
      setStatus('recording');
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access and try again.'
        : `Microphone could not start: ${err.message}`);
      setStatus('idle');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function searchTranscript(event) {
    event.preventDefault();
    const payload = new FormData();
    payload.append('transcript', manualTranscript);
    submitPayload(payload);
  }

  return (
    <>
      <PageHeader title="Voice book search" description="Search the full library catalog by speaking an English title, author, topic, faculty, department, or course." />
      <AIModelStatus />
      <Card className="voice-card">
        <div className={`voice-pad voice-${status}`}>
          <div className="voice-orb"><Mic size={36} /></div>
          <h2>{status === 'recording' ? 'Listening...' : status === 'processing' ? 'Processing audio...' : 'Ready to listen'}</h2>
          <p>Press start, speak a book title or subject clearly, then stop. The recording also stops automatically after 5 seconds.</p>
          {error && <div className="inline-error">{error}</div>}
          <div className="button-row centered">
            <Button onClick={startRecording} disabled={status === 'recording' || status === 'processing'}><Mic size={16} /> Start recording</Button>
            <Button variant="secondary" onClick={stopRecording} disabled={status !== 'recording'}><Square size={16} /> Stop</Button>
          </div>
        </div>
      </Card>
      <Card title="Library text search">
        <form className="inline-form voice-manual-form" onSubmit={searchTranscript}>
          <input value={manualTranscript} onChange={(event) => setManualTranscript(event.target.value)} placeholder="Type any title, keyword, or topic to search the catalog..." />
          <Button type="submit" disabled={!manualTranscript.trim() || status === 'processing'}><Search size={16} /> Search</Button>
        </form>
      </Card>
      {result && (
        <Card title="Voice search result" eyebrow={`AI status: ${result.ai_status || 'ready'}`}>
          <div className="transcript-panel">
            <span>Transcript</span>
            <strong>{result.transcript || 'No transcript returned'}</strong>
            {result.stt?.confidence !== undefined && <small>Confidence: {(result.stt.confidence * 100).toFixed(1)}%</small>}
            {result.stt?.model && <small>Model: {result.stt.model}</small>}
          </div>
          {result.action?.type === 'navigate' && (
            <div className="button-row">
              <Button onClick={() => navigate(result.action.path)}>{result.action.label}</Button>
            </div>
          )}
          {!result.action && (result.results?.length ? (
            <div className="book-grid">{result.results.map((book) => <BookCard key={book.id} book={book} role={user.role} />)}</div>
          ) : (
            <div className="state-panel"><h3>No matching books</h3><p>Try another phrase or make sure the STT service returned a usable transcript.</p></div>
          ))}
        </Card>
      )}
    </>
  );
}
