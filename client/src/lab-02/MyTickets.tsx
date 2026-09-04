import { useEffect, useState } from 'react';

import type { Requester } from './RequesterSelection';

type Ticket = {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority: string;
  ticketDate: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
};

interface MyTicketsProps {
  requester: Requester;
}

export function MyTickets({ requester }: MyTicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'empty'>('loading');
  const [search, setSearch] = useState('');

  async function load() {
    setStatus('loading');
    try {
      const params = new URLSearchParams({ requesterId: String(requester.id) });
      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { tickets: Ticket[] };
      setTickets(data.tickets);
      setStatus(data.tickets.length === 0 ? 'empty' : 'success');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requester.id]);

  const filtered = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.summary.toLowerCase().includes(q);
  });

  const showEmpty = status === 'empty';
  const showNoResults = status === 'success' && filtered.length === 0;

  return (
    <main className="container py-4" style={{ maxWidth: '46rem' }}>
      <h1 className="h4 mb-3">My Tickets</h1>
      <div className="mb-3">
        <input
          placeholder="Search tickets..."
          className="form-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {status === 'loading' && <p role="status">Loading tickets...</p>}
      {status === 'error' && <p role="alert" className="text-danger">Unable to load tickets. Please try again.</p>}
      {showEmpty && <p>No tickets yet. Create your first ticket.</p>}
      {showNoResults && <p>No tickets match your search.</p>}

      {status === 'success' && filtered.length > 0 && (
        <div className="list-group">
          {filtered.map((t) => (
            <div key={t.id} className="list-group-item">
              <strong>{t.ticketNumber}</strong> — {t.summary} <span className="badge bg-light text-dark">{t.currentStatus}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}