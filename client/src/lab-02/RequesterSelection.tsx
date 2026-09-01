import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000';

export type Requester = { id: number; name: string; email: string };

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface RequesterSelectionProps {
  onContinue: (requester: Requester) => void;
}

export function RequesterSelection({ onContinue }: RequesterSelectionProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState('');

  async function loadRequesters() {
    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/api/requesters`);
      if (!response.ok) {
        throw new Error(`Requesters request failed: ${response.status}`);
      }
      const data = (await response.json()) as Requester[];
      setRequesters(data);
      setStatus(data.length === 0 ? 'empty' : 'success');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    loadRequesters();
  }, []);

  const selected = requesters.find((r) => r.id === Number(selectedId));

  return (
    <main className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <section className="card shadow-sm p-4" style={{ maxWidth: '28rem', width: '100%' }}>
        <h1 className="h4 mb-1">TokTickIT</h1>
        <p className="text-muted mb-4">
          Select a Development Requester to test requester-specific ticket
          behavior. This is not a login screen.
        </p>

        {status === 'loading' && (
          <p role="status" className="text-muted">
            Loading requesters...
          </p>
        )}

        {status === 'success' && (
          <>
            <div className="mb-3">
              <label htmlFor="requester" className="form-label">
                Development Requester
              </label>
              <select
                id="requester"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select a requester</option>
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={!selected}
              onClick={() => selected && onContinue(selected)}
            >
              Continue
            </button>
          </>
        )}

        {status === 'empty' && (
          <p className="text-muted">No active requesters found</p>
        )}

        {status === 'error' && (
          <div>
            <p className="text-danger" role="alert">
              Unable to load requesters. Please try again.
            </p>
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={loadRequesters}
            >
              Retry
            </button>
          </div>
        )}
      </section>
    </main>
  );
}