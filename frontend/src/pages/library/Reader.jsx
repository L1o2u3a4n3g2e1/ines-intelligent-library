import { Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as booksApi from '../../api/books.js';
import * as progressApi from '../../api/progress.js';
import * as ttsApi from '../../api/tts.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useAsync } from '../../hooks/useAsync.js';

function splitIntoSections(text, maxLength = 1800) {
  const paragraphs = String(text || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const sections = [];
  let current = '';

  paragraphs.forEach((paragraph) => {
    if (current && current.length + paragraph.length + 2 > maxLength) {
      sections.push(current);
      current = '';
    }
    if (paragraph.length > maxLength) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
      sentences.forEach((sentence) => {
        if (current && current.length + sentence.length + 1 > maxLength) {
          sections.push(current);
          current = '';
        }
        current = `${current} ${sentence.trim()}`.trim();
      });
    } else {
      current = `${current}\n\n${paragraph}`.trim();
    }
  });
  if (current) sections.push(current);
  return sections;
}

export default function Reader() {
  const { id } = useParams();
  const bookState = useAsync(() => booksApi.getBook(id), [id]);
  const contentState = useAsync(() => booksApi.getBookContent(id), [id]);
  const progressState = useAsync(() => progressApi.getProgress(id), [id]);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [speechState, setSpeechState] = useState('idle');
  const [speechError, setSpeechError] = useState('');
  const [rate, setRate] = useState(1);
  const initializedRef = useRef(false);
  const audioRef = useRef(null);
  const startedAtRef = useRef(0);
  const book = bookState.data;
  const sections = useMemo(() => splitIntoSections(contentState.data?.text), [contentState.data?.text]);
  const fallbackSection = useMemo(() => {
    if (sections.length || !book) return '';
    const summary = [book.title, book.description].filter(Boolean).join('. ');
    return summary ? `No full readable text was extracted from this book file. Narrating the available catalog summary instead.\n\n${summary}` : '';
  }, [book, sections.length]);
  const readableSections = sections.length ? sections : (fallbackSection ? [fallbackSection] : []);
  const currentSection = readableSections[sectionIndex] || '';
  const progress = readableSections.length ? Math.round(((sectionIndex + 1) / readableSections.length) * 100) : 0;
  const audioFiles = (book?.files || []).filter((file) => file.file_type === 'audio');
  const readableFile = (book?.files || []).find((file) => ['pdf', 'document', 'text'].includes(file.file_type));

  useEffect(() => {
    if (initializedRef.current || contentState.loading || progressState.loading || !readableSections.length) return;
    const savedPage = Number(progressState.data?.last_page || 0);
    setSectionIndex(Math.min(Math.max(savedPage, 0), readableSections.length - 1));
    initializedRef.current = true;
  }, [contentState.loading, progressState.loading, progressState.data, readableSections.length]);

  useEffect(() => () => audioRef.current?.pause(), []);

  async function saveProgress(index, readingSeconds = 0) {
    if (!readableSections.length) return;
    const percentage = Math.round(((index + 1) / readableSections.length) * 100);
    await progressApi.updateProgress(id, {
      last_page: index,
      last_section: `Section ${index + 1} of ${readableSections.length}`,
      progress_percentage: percentage,
      total_reading_time_seconds: readingSeconds,
      completed_status: percentage >= 100 ? 'completed' : 'in_progress',
    });
  }

  function stopSpeech() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeechState('idle');
  }

  async function speak() {
    setSpeechError('');
    if (!currentSection) {
      setSpeechError('This book does not contain readable text yet.');
      return;
    }
    if (speechState === 'paused') {
      await audioRef.current?.play();
      setSpeechState('playing');
      return;
    }
    try {
      setSpeechState('loading');
      const response = await ttsApi.synthesize({ book_id: Number(id), text: currentSection, language: 'en' });
      audioRef.current.src = ttsApi.audioUrl(response.data.audio_url);
      audioRef.current.playbackRate = rate;
      startedAtRef.current = Date.now();
      await audioRef.current.play();
      setSpeechState('playing');
    } catch (error) {
      setSpeechError(error.message);
      setSpeechState('idle');
    }
  }

  function pause() {
    audioRef.current?.pause();
    setSpeechState('paused');
  }

  async function moveToSection(nextIndex) {
    if (!readableSections.length) return;
    stopSpeech();
    const bounded = Math.min(Math.max(nextIndex, 0), readableSections.length - 1);
    setSectionIndex(bounded);
    await saveProgress(bounded);
  }

  async function resetProgress() {
    stopSpeech();
    setSectionIndex(0);
    await progressApi.updateProgress(id, {
      last_page: 0,
      last_section: 'Section 1',
      progress_percentage: 0,
      total_reading_time_seconds: 0,
      completed_status: 'not_started',
    });
  }

  return (
    <DataState loading={bookState.loading} error={bookState.error} empty={!book} onRetry={bookState.reload}>
      <PageHeader title="Audio reader" description={book?.title} />
      <Card>
        <article className="reader-panel">
          {contentState.loading && <div className="state-panel"><div className="loader" /><p>Extracting readable book content...</p></div>}
          {contentState.error && <div className="inline-error">{contentState.error}</div>}
          {speechError && <div className="inline-error" role="alert">{speechError}</div>}
          <div className="reader-status">
            <strong>{readableSections.length ? `Section ${sectionIndex + 1} of ${readableSections.length}` : 'No readable sections'}</strong>
            <span>{progress}% completed</span>
          </div>
          {!sections.length && fallbackSection && (
            <div className="inline-note">
              Full text could not be extracted from this file. Audio narration is using the catalog summary, and the original book can still be viewed below.
            </div>
          )}
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="reader-text">
            <h2>{book?.title}</h2>
            <p>{currentSection || book?.description || 'Upload a PDF, Word, or text document to make this book readable.'}</p>
          </div>
          <div className="reader-options">
            <label>
              Narration speed
              <select value={rate} onChange={(event) => setRate(Number(event.target.value))} disabled={speechState !== 'idle'}>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </label>
          </div>
          <audio
            ref={audioRef}
            onEnded={() => {
              const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
              setSpeechState('idle');
              saveProgress(sectionIndex, seconds).catch(() => {});
            }}
            onError={() => setSpeechState('idle')}
          />
          <div className="button-row centered">
            <Button variant="ghost" size="icon" aria-label="Previous section" disabled={sectionIndex === 0} onClick={() => moveToSection(sectionIndex - 1)}><SkipBack size={18} /></Button>
            <Button size="icon" aria-label={speechState === 'paused' ? 'Resume narration' : 'Play gTTS narration'} onClick={speak} disabled={!currentSection || ['playing', 'loading'].includes(speechState)}><Play size={18} /></Button>
            <Button variant="secondary" size="icon" aria-label="Pause narration" onClick={pause} disabled={speechState !== 'playing'}><Pause size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="Stop narration" onClick={stopSpeech} disabled={speechState === 'idle'}><Square size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="Next section" disabled={!readableSections.length || sectionIndex >= readableSections.length - 1} onClick={() => moveToSection(sectionIndex + 1)}><SkipForward size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="Reset progress" onClick={resetProgress}><RotateCcw size={18} /></Button>
          </div>
          {audioFiles.length > 0 && (
            <div className="book-audio-list">
              <h3>Uploaded audio</h3>
              {audioFiles.map((file) => (
                <div className="book-audio" key={file.id}>
                  <span>{file.original_name}</span>
                  <audio controls preload="metadata" src={booksApi.fileStreamUrl(file.id)}>Your browser does not support audio playback.</audio>
                </div>
              ))}
            </div>
          )}
          {readableFile?.file_type === 'pdf' && (
            <div className="reader-viewer">
              <h3>View book</h3>
              <iframe title={`${book?.title} PDF viewer`} src={booksApi.fileStreamUrl(readableFile.id)} />
            </div>
          )}
          {book?.files?.length > 0 && (
            <div className="button-row centered reader-downloads">
              {book.files.map((file) => (
                <a className="button button-secondary button-sm" key={file.id} href={booksApi.fileDownloadUrl(file.id)}>Download {file.file_type}</a>
              ))}
            </div>
          )}
        </article>
      </Card>
    </DataState>
  );
}
