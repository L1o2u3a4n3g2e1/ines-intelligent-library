import { Link } from 'react-router-dom';
import Card from '../../components/Card.jsx';

export default function Unauthorized() {
  return (
    <main className="auth-page">
      <Card title="Access denied" className="auth-panel">
        <p>Your role does not have permission to open this page.</p>
        <Link className="button button-primary button-md" to="/login">Switch account</Link>
      </Card>
    </main>
  );
}
