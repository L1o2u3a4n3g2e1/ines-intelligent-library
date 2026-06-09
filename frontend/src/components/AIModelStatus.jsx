import { Cpu, RadioTower } from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import * as voiceApi from '../api/voiceSearch.js';
import DataState from './DataState.jsx';

function statusLabel(status) {
  return String(status || '').replaceAll('_', ' ');
}

function taskLabel(task) {
  return String(task || '').replaceAll('_', ' ');
}

export default function AIModelStatus() {
  const state = useAsync(voiceApi.getAiModels, []);

  return (
    <DataState loading={state.loading} error={state.error} empty={!state.data?.length} onRetry={state.reload}>
      <section className="ai-model-strip">
        {state.data?.map((model) => (
          <article className={`ai-model-card ai-model-${model.status}`} key={`${model.name}-${model.task}`}>
            <div className="ai-model-icon">{model.status === 'ready' ? <RadioTower size={18} /> : <Cpu size={18} />}</div>
            <div>
              <h3>{model.name}</h3>
              <p>{taskLabel(model.task)}</p>
              <span>{statusLabel(model.status)}</span>
            </div>
          </article>
        ))}
      </section>
    </DataState>
  );
}
