import * as booksApi from '../../api/books.js';
import { Link } from 'react-router-dom';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Table from '../../components/Table.jsx';
import { useAsync } from '../../hooks/useAsync.js';

export default function BookManagement() {
  const state = useAsync(() => booksApi.listBooks(), []);
  return (
    <>
      <PageHeader
        title="Book management"
        description="Maintain metadata, copies, covers, uploaded files, and student submissions."
        actions={(
          <div className="button-row">
            <Link className="button button-secondary button-md" to="/admin/book-submissions">Verify student submissions</Link>
            <Link className="button button-primary button-md" to="/admin/uploads">Add or upload book</Link>
          </div>
        )}
      />
      <DataState loading={state.loading} error={state.error} empty={!state.data?.length} onRetry={state.reload}>
        <Card><Table columns={[{ key: 'title', label: 'Title' }, { key: 'author', label: 'Author' }, { key: 'category', label: 'Category' }, { key: 'course', label: 'Course' }, { key: 'availableCopies', label: 'Available' }, { key: 'totalCopies', label: 'Total' }]} rows={state.data || []} /></Card>
      </DataState>
    </>
  );
}
