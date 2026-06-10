import { BookOpen, Clock, Heart, ListChecks } from 'lucide-react';
import * as borrowApi from '../../api/borrow.js';
import * as favoritesApi from '../../api/favorites.js';
import * as progressApi from '../../api/progress.js';
import * as recommendationsApi from '../../api/recommendations.js';
import BookCard from '../../components/BookCard.jsx';
import AIModelStatus from '../../components/AIModelStatus.jsx';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import DashboardBrand from '../../components/DashboardBrand.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PersonalLibraryPanel from '../../components/PersonalLibraryPanel.jsx';
import StatCard from '../../components/StatCard.jsx';
import { useAsync } from '../../hooks/useAsync.js';

export default function StudentDashboard() {
  const borrowed = useAsync(borrowApi.myBorrowedBooks, []);
  const favorites = useAsync(favoritesApi.listFavorites, []);
  const readingProgress = useAsync(progressApi.listProgress, []);
  const recommended = useAsync(recommendationsApi.listRecommendations, []);
  const borrowedRows = borrowed.data || [];
  const now = Date.now();
  const dueSoon = borrowedRows.filter((row) => {
    const due = row.dueDate ? new Date(row.dueDate).getTime() : 0;
    return row.status === 'approved' && due >= now && due <= now + (7 * 24 * 60 * 60 * 1000);
  }).length;
  const progressRows = readingProgress.data || [];
  const averageProgress = progressRows.length
    ? Math.round(progressRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / progressRows.length)
    : 0;

  return (
    <>
      <PageHeader eyebrow="Student workspace" title="Dashboard" description="Continue reading, track requests, and discover course resources." />
      <DashboardBrand title="Welcome to INES Digital Library" description="Your academic and private reading workspace." />
      <Card title="Speech-to-text in this dashboard" eyebrow="Transformer primary">
        <p>Your microphone searches use the Wav2Vec2 Transformer English STT service first, then fall back to Whisper if the Transformer cannot decode the recording.</p>
        <AIModelStatus />
      </Card>
      <div className="stat-grid">
        <StatCard label="Borrowed books" value={borrowedRows.length} icon={BookOpen} tone="blue" />
        <StatCard label="Due soon" value={dueSoon} icon={Clock} tone="amber" />
        <StatCard label="Reading progress" value={`${averageProgress}%`} icon={ListChecks} tone="green" />
        <StatCard label="Favorites" value={favorites.data?.length || 0} icon={Heart} tone="rose" />
      </div>
      <PersonalLibraryPanel compact />
      <DataState loading={recommended.loading} error={recommended.error} empty={!recommended.data?.length} onRetry={recommended.reload}>
        <Card title="Recommended for you" eyebrow="Based on your course">
          <div className="book-grid">{recommended.data?.map((book) => <BookCard key={book.id} book={book} role="student" />)}</div>
        </Card>
      </DataState>
    </>
  );
}
