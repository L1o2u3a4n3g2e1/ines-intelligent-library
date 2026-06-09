import { Download, Headphones } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as borrowApi from '../../api/borrow.js';
import * as booksApi from '../../api/books.js';
import * as favoritesApi from '../../api/favorites.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';

export default function BookDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const bookState = useAsync(() => booksApi.getBook(id), [id]);
  const book = bookState.data;

  async function runAction(action, successMessage) {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <DataState loading={bookState.loading} error={bookState.error} empty={!book} onRetry={bookState.reload}>
      <PageHeader title={book?.title} description={book?.description} />
      {message && <div className="inline-info">{message}</div>}
      {error && <div className="inline-error" role="alert">{error}</div>}
      <section className="details-layout">
        <div className="book-cover hero-cover" style={{ background: book?.coverColor }}><span>{book?.title?.slice(0, 2).toUpperCase()}</span></div>
        <Card title="Book information">
          <div className="detail-grid">
            <span>Author</span><strong>{book?.author}</strong>
            <span>ISBN</span><strong>{book?.isbn}</strong>
            <span>Year</span><strong>{book?.year}</strong>
            <span>Faculty</span><strong>{book?.faculty}</strong>
            <span>Department</span><strong>{book?.department}</strong>
            <span>Course</span><strong>{book?.course}</strong>
            <span>Availability</span><strong>{book?.availableCopies} / {book?.totalCopies}</strong>
          </div>
          <div className="button-row">
            {user.role === 'student' && <Button onClick={() => runAction(() => borrowApi.requestBorrow(book.id), 'Borrow request sent.')}>Borrow / Request</Button>}
            {user.role === 'student' && <Button variant="secondary" onClick={() => runAction(() => favoritesApi.toggleFavorite(book.id), 'Favorites updated.')}>Favorite</Button>}
            <Link className="button button-ghost button-md" to={`/reader/${book?.id}`}><Headphones size={16} /> Listen</Link>
          </div>
        </Card>
        <Card title="Book files">
          {book?.files?.length ? (
            <div className="file-list">
              {book.files.map((file) => (
                <a className="file-row" key={file.id} href={booksApi.fileDownloadUrl(file.id)}>
                  <span>{file.original_name}</span>
                  <small>{file.file_type}</small>
                  <Download size={16} />
                </a>
              ))}
            </div>
          ) : (
            <p>No files uploaded for this book yet.</p>
          )}
        </Card>
      </section>
    </DataState>
  );
}
