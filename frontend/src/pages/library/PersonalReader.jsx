import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as personalBooksApi from '../../api/personalBooks.js';
import * as ttsApi from '../../api/tts.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useAsync } from '../../hooks/useAsync.js';

function sectionsFrom(text, maxLength = 2800) {
  const sentences = String(text || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const sections = [];
  let current = '';
  sentences.forEach((sentence) => {
    if (current && current.length + sentence.length > maxLength) {
      sections.push(current.trim());
      current = '';
    }
    current = `${current} ${sentence.trim()}`;
  });
  if (current.trim()) sections.push(current.trim());
  return sections;
}

export default function PersonalReader() {
  const { id } = useParams();
  const book = useAsync(() => personalBooksApi.getPersonalBook(id), [id]);
  const content = useAsync(() => personalBooksApi.getPersonalBookContent(id), [id]);
  const audioRef = useRef(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [audioState, setAudioState] = useState('idle');
  const [audioError, setAudioError] = useState('');
  const [rate, setRate] = useState(1);
  const sections = useMemo(() => sectionsFrom(content.data?.text), [content.data?.text]);
  const currentSection = sections[sectionIndex] || '';

  useEffect(() => () => audioRef.current?.pause(), []);

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioState('idle');
  }

  async function play() {
    setAudioError('');
    if (audioState === 'paused' && audioRef.current) {
      await audioRef.current.play();
      setAudioState('playing');
      return;
    }
    try {
      setAudioState('loading');
      const response = await ttsApi.synthesize({ text: currentSection, language: 'en' });
      audioRef.current.src = ttsApi.audioUrl(response.data.audio_url);
      audioRef.current.playbackRate = rate;
      await audioRef.current.play();
      setAudioState('playing');
    } catch (err) {
      setAudioError(err.message);
      setAudioState('idle');
    }
  }

  function pause() {
    audioRef.current?.pause();
    setAudioState('paused');
  }

  function move(next) {
    stop();
    setSectionIndex(Math.min(Math.max(next, 0), Math.max(sections.length - 1, 0)));
  }

  return (
    <DataState loading={book.loading || content.loading} error={book.error || content.error} empty={!book.data} onRetry={() => { book.reload(); content.reload(); }}>
      <PageHeader title={book.data?.title || 'Private book'} description="Read privately or listen with server-generated English narration." />
      <Card>
        <article className="reader-panel">
          {audioError && <div className="inline-error" role="alert">{audioError}</div>}
          <div className="reader-status">
            <strong>{sections.length ? `Section ${sectionIndex + 1} of ${sections.length}` : 'No readable sections'}</strong>
            <span>{book.data?.author || 'Unknown author'}</span>
          </div>
          <div className="reader-text"><p>{currentSection || book.data?.description || 'No readable text was found.'}</p></div>
          <div className="reader-options">
            <label>Narration speed
              <select value={rate} onChange={(event) => setRate(Number(event.target.value))} disabled={audioState === 'playing'}>
                <option value={0.75}>0.75x</option><option value={1}>1x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option>
              </select>
            </label>
          </div>
          <audio ref={audioRef} onEnded={() => setAudioState('idle')} onError={() => setAudioState('idle')} />
          <div className="button-row centered">
            <Button variant="ghost" size="icon" aria-label="Previous section" disabled={sectionIndex === 0} onClick={() => move(sectionIndex - 1)}><SkipBack size={18} /></Button>
            <Button size="icon" aria-label="Play narration" disabled={!currentSection || ['playing', 'loading'].includes(audioState)} onClick={play}><Play size={18} /></Button>
            <Button variant="secondary" size="icon" aria-label="Pause narration" disabled={audioState !== 'playing'} onClick={pause}><Pause size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="Stop narration" disabled={audioState === 'idle'} onClick={stop}><Square size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="Next section" disabled={!sections.length || sectionIndex >= sections.length - 1} onClick={() => move(sectionIndex + 1)}><SkipForward size={18} /></Button>
          </div>
        </article>
      </Card>
    </DataState>
  );
}
