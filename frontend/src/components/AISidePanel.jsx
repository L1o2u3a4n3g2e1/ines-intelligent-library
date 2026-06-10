import { BrainCircuit, Sparkles, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AISidePanel({ role = 'workspace', insight = 'Ready to assist with library tasks.' }) {
  return (
    <aside className="ai-side-panel">
      <div className="ai-panel-head">
        <div className="ai-mark"><BrainCircuit size={21} /></div>
        <div>
          <p className="eyebrow">AI side</p>
          <h2>Research assistant</h2>
        </div>
      </div>
      <p>{insight}</p>
      <div className="ai-action-list">
        <Link className="ai-action" to="/recommendations">
          <Sparkles size={18} />
          <span>Smart recommendations</span>
        </Link>
        {role === 'lecturer' && (
          <Link className="ai-action" to="/lecturer/uploads">
            <Wand2 size={18} />
            <span>Prepare book upload</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
