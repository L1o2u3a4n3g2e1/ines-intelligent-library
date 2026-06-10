import Button from './Button.jsx';

export default function DataState({ loading, error, empty, onRetry, children }) {
  if (loading) {
    return (
      <div className="state-panel">
        <div className="loader" />
        <p>Loading current library data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-panel state-error">
        <h3>Something needs attention</h3>
        <p>{error}</p>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="state-panel">
        <h3>No records yet</h3>
        <p>Once the backend has data, this section will fill automatically.</p>
      </div>
    );
  }

  return children;
}
