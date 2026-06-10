import { Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as booksApi from '../../api/books.js';
import * as progressApi from '../../api/progress.js';
import * as ttsApi from '../../api/tts.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useAsync } from '../../hooks/useAsync.js';

export default function Reader() {
  const { id } = useParams();
  const [pageNumber, setPageNumber] = useState(1);
  const [speechState, setSpeechState] = useState('idle');
  const [speechError, setSpeechError] = useState('');
  const [rate, setRate] = useState(1);
  const initializedRef = useRef(false);
  const audioRef = useRef(null);
  const startedAtRef = useRef(0);

  const bookState = useAsync(() => booksApi.getBook(id), [id]);
  const pageState = useAsync(() => booksApi.getBookPage(id, pageNumber), [id, pageNumber]);
  const progressState = useAsync(() => progressApi.getProgress(id), [id]);
  const book = bookState.data;
  const page = pageState.data;
  const totalPages = Math.max(1, Number(page?.total_pages || pageNumber || 1));
  const audioFiles = (book?.files || []).filter((file) => file.file_type === 'audio');
  const readableFile = (book?.files || []).find((file) => ['pdf', 'document', 'docx', 'txt'].includes(file.file_type));
  const currentText = String(page?.text || '').trim();
  const fallbackText = !currentText && book
    ? [book.title, book.description].filter(Boolean).join('. ')
    : '';
  const narratableText = currentText || fallbackText;
  const progress = Math.min(100, Math.round((pageNumber / totalPages) * 100));
  const viewerUrl = readableFile ? `${booksApi.fileStreamUrl(readableFile.id)}#page=${pageNumber}&view=FitH` : '';

  useEffect(() => {
    if (initializedRef.current || progressState.loading) return;
    const savedPage = Number(progressState.data?.last_page || 0) + 1;
    if (savedPage > 1) setPageNumber(savedPage);
    initializedRef.current = true;
  }, [progressState.loading, progressState.data]);

  useEffect(() => () => audioRef.current?.pause(), []);

  async function saveProgress(nextPage = pageNumber, readingSeconds = 0) {
    const percentage = Math.min(100, Math.round((nextPage / totalPages) * 100));
    await progressApi.updateProgress(id, {
      last_page: Math.max(0, nextPage - 1),
      last_section: `Page ${nextPage} of ${totalPages}`,
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
    if (!narratableText) {
      setSpeechError('This page does not contain readable English text yet.');
      return;
    }
    if (speechState === 'paused') {
      await audioRef.current?.play();
      setSpeechState('playing');
      return;
    }
    try {
      setSpeechState('loading');
      const response = await ttsApi.synthesize({ book_id: Number(id), text: narratableText, language: 'en' });
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

  async function moveToPage(nextPage) {
    stopSpeech();
    const bounded = Math.min(Math.max(nextPage, 1), totalPages);
    setPageNumber(bounded);
    await saveProgress(bounded);
  }

  async function resetProgress() {
    stopSpeech();
    setPageNumber(1);
    await progressApi.updateProgress(id, {
      last_page: 0,
      last_section: 'Page 1',
      progress_percentage: 0,
      total_reading_time_seconds: 0,
      completed_status: 'not_started',
    });
  }

  return (
    <DataState loading={bookState.loading} error={bookState.error} empty={!book} onRetry={bookState.reload}>
      <PageHeader title="Online book reader" description={book?.title} />
      <Card className="reader-card">
        <article className="reader-shell">
          <section className="reader-book-pane">
            <div className="reader-book-toolbar">
              <strong>{book?.title}</strong>
              <span>Page {pageNumber} of {totalPages}</span>
            </div>
            {viewerUrl ? (
              <iframe title={`${book?.title} online viewer`} src={viewerUrl} />
            ) : (
              <div className="state-panel">
                <h3>No viewable document</h3>
                <p>This book has no PDF, Word, or text file attached yet.</p>
              </div>
            )}
          </section>

          <section className="reader-listen-pane">
            {speechError && <div className="inline-error" role="alert">{speechError}</div>}
            {pageState.loading && <div className="inline-info">Extracting this page only. Narration should be ready in a few seconds...</div>}
            {pageState.error && (
              <div className="inline-note">
                This page has no extractable text. You can still view it, and narration will use the catalog summary when available.
              </div>
            )}
            {!pageState.loading && !pageState.error && !currentText && fallbackText && (
              <div className="inline-note">
                This page is mostly cover art or scanned content. You can still view it; narration will use the catalog summary, or open the next page for book text.
              </div>
            )}
            <div className="reader-status">
              <strong>Page {pageNumber} narration</strong>
              <span>{progress}% completed</span>
            </div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="reader-text">
              <h2>{pageState.loading ? 'Preparing page text...' : `Page ${pageNumber}`}</h2>
              <p>{narratableText || 'This page is viewable, but no readable text was found for narration.'}</p>
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
                saveProgress(pageNumber, seconds).catch(() => {});
              }}
              onError={() => setSpeechState('idle')}
            />
            <div className="button-row centered">
              <Button variant="ghost" size="icon" aria-label="Previous page" disabled={pageNumber === 1} onClick={() => moveToPage(pageNumber - 1)}><SkipBack size={18} /></Button>
              <Button size="icon" aria-label={speechState === 'paused' ? 'Resume narration' : 'Play page narration'} onClick={speak} disabled={pageState.loading || !narratableText || ['playing', 'loading'].includes(speechState)}><Play size={18} /></Button>
              <Button variant="secondary" size="icon" aria-label="Pause narration" onClick={pause} disabled={speechState !== 'playing'}><Pause size={18} /></Button>
              <Button variant="ghost" size="icon" aria-label="Stop narration" onClick={stopSpeech} disabled={speechState === 'idle'}><Square size={18} /></Button>
              <Button variant="ghost" size="icon" aria-label="Next page" disabled={pageNumber >= totalPages} onClick={() => moveToPage(pageNumber + 1)}><SkipForward size={18} /></Button>
              <Button variant="ghost" size="icon" aria-label="Reset progress" onClick={resetProgress}><RotateCcw size={18} /></Button>
            </div>
            <form className="reader-page-jump" onSubmit={(event) => {
              event.preventDefault();
              const value = Number(new FormData(event.currentTarget).get('page'));
              moveToPage(value || 1);
            }}>
              <label>Go to page<input name="page" type="number" min="1" max={totalPages} defaultValue={pageNumber} /></label>
              <Button type="submit" variant="secondary">Open</Button>
            </form>
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
            {book?.files?.length > 0 && (
              <div className="button-row centered reader-downloads">
                {book.files.map((file) => (
                  <a className="button button-secondary button-sm" key={file.id} href={booksApi.fileDownloadUrl(file.id)}>Download {file.file_type}</a>
                ))}
              </div>
            )}
          </section>
        </article>
      </Card>
    </DataState>
  );
}
