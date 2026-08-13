import { useState } from 'react';

const API_URL = 'http://localhost:3000';

type Status = 'idle' | 'loading' | 'online' | 'error';

export function App() {
  const [status, setStatus] = useState<Status>('idle');

  async function checkSystem() {
    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Unexpected health check response');
      }
      setStatus('online');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="container py-5">
      <section className="mx-auto text-center" style={{ maxWidth: '42rem' }}>
        <h1 className="mb-4">TokTickIT IT Service Desk</h1>
        <button type="button" className="btn btn-primary" onClick={checkSystem}>
          Check System
        </button>

        {status === 'loading' && (
          <p className="mt-4" role="status">
            Checking system...
            <span
              className="spinner-border spinner-border-sm ms-2"
              aria-hidden="true"
            />
          </p>
        )}
        {status === 'online' && (
          <p className="mt-4 text-success">System Status: Online</p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-danger" role="alert">
            Unable to reach the backend. Please make sure the server is running.
          </p>
        )}
      </section>
    </main>
  );
}
