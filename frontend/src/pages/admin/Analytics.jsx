import * as analyticsApi from '../../api/analytics.js';
import Card from '../../components/Card.jsx';
import DataState from '../../components/DataState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import { useAsync } from '../../hooks/useAsync.js';

export default function Analytics() {
  const state = useAsync(analyticsApi.getAnalytics, []);
  const data = state.data || {};
  return (
    <>
      <PageHeader title="Analytics" description="Operational metrics for circulation, usage, voice search, and TTS." />
      <DataState loading={state.loading} error={state.error} empty={!state.data} onRetry={state.reload}>
        <Card title="System metrics">
          <div className="stat-grid compact">
            {Object.entries(data).map(([key, value]) => <StatCard key={key} label={key.replace(/([A-Z])/g, ' $1')} value={value} />)}
          </div>
        </Card>
      </DataState>
    </>
  );
}
