import * as usersApi from '../../api/users.js';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Table from '../../components/Table.jsx';
import { roleLabels } from '../../utils/roles.js';
import { useAsync } from '../../hooks/useAsync.js';

export default function UserManagement() {
  const state = useAsync(() => usersApi.listUsers(), []);
  return (
    <>
      <PageHeader title="User management" description="Search, review, and manage students, lecturers, and librarians." />
      <DataState loading={state.loading} error={state.error} empty={!state.data?.length} onRetry={state.reload}>
        <Card><Table columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (row) => roleLabels[row.role] }, { key: 'status', label: 'Status' }, { key: 'department', label: 'Department' }]} rows={state.data || []} /></Card>
      </DataState>
    </>
  );
}
