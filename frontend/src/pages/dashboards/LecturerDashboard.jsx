import { BarChart3, BookMarked, GraduationCap, Upload } from 'lucide-react';
import * as booksApi from '../../api/books.js';
import * as readingListsApi from '../../api/readingLists.js';
import AISidePanel from '../../components/AISidePanel.jsx';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import DashboardBrand from '../../components/DashboardBrand.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import Table from '../../components/Table.jsx';
import { useAsync } from '../../hooks/useAsync.js';

export default function LecturerDashboard() {
  const lists = useAsync(readingListsApi.listReadingLists, []);
  const books = useAsync(booksApi.listBooks, []);
  const readingListCount = lists.data?.length || 0;
  const publishedLists = (lists.data || []).filter((item) => item.status === 'published').length;
  const listedBooks = (lists.data || []).reduce((sum, item) => sum + Number(item.books || 0), 0);

  return (
    <>
      <PageHeader eyebrow="Lecturer workspace" title="Dashboard" description="Manage reading lists, resources, and student engagement." />
      <DashboardBrand title="Welcome to INES Digital Library" description="Build course resources and guide students to trusted academic materials." />
      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="stat-grid compact">
            <StatCard label="Reading lists" value={readingListCount} icon={BookMarked} tone="blue" meta="Synced from XAMPP" />
            <StatCard label="Library books" value={books.data?.length || 0} icon={Upload} tone="green" />
            <StatCard label="Books in lists" value={listedBooks} icon={GraduationCap} tone="amber" />
            <StatCard label="Published lists" value={publishedLists} icon={BarChart3} tone="rose" />
          </div>
          <DataState loading={lists.loading} error={lists.error} empty={!lists.data?.length} onRetry={lists.reload}>
            <Card title="Current reading lists">
              <Table columns={[{ key: 'title', label: 'Title' }, { key: 'course', label: 'Course' }, { key: 'books', label: 'Books' }, { key: 'status', label: 'Status' }]} rows={lists.data || []} />
            </Card>
          </DataState>
        </section>
        <AISidePanel
          role="lecturer"
          insight={`${readingListCount} reading list${readingListCount === 1 ? '' : 's'} loaded from the XAMPP database. Use AI tools to search by voice, prepare uploads, and surface course recommendations.`}
        />
      </div>
    </>
  );
}
