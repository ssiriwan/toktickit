import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface RequesterMetrics {
  totalOpen: number;
  waitingForRequester: number;
  recentlyUpdated: number;
  recentlyResolved: number;
  closed: number;
}

interface RecentTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority: string;
  updatedAt: string;
}

const CARDS: { key: keyof RequesterMetrics; label: string; to: string }[] = [
  { key: 'totalOpen', label: 'My Open Tickets', to: '/tickets' },
  { key: 'waitingForRequester', label: 'Waiting for Requester', to: '/tickets?status=WAITING_FOR_REQUESTER' },
  { key: 'recentlyUpdated', label: 'Recently Updated', to: '/tickets?sort=updatedAt&order=desc' },
  { key: 'recentlyResolved', label: 'Recently Resolved', to: '/tickets?status=RESOLVED' },
  { key: 'closed', label: 'Closed', to: '/tickets?status=CLOSED' }
];

export function RequesterDashboard({ userName }: { userName: string }) {
  const [metrics, setMetrics] = useState<RequesterMetrics | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/requester/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { metrics: RequesterMetrics; recentTickets: RecentTicket[] };
      setMetrics(data.metrics);
      setRecentTickets(Array.isArray(data.recentTickets) ? data.recentTickets : []);
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') return <p role="status" className="container py-4">Loading dashboard...</p>;
  if (state === 'error' || !metrics) {
    return (
      <main className="container py-4">
        <p role="alert" className="text-danger">Unable to load dashboard.</p>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load}>Retry</button>
      </main>
    );
  }

  const isEmpty =
    metrics.totalOpen === 0 &&
    metrics.waitingForRequester === 0 &&
    metrics.recentlyUpdated === 0 &&
    metrics.recentlyResolved === 0 &&
    metrics.closed === 0;

  return (
    <main className="container py-4" style={{ maxWidth: '56rem' }}>
      <h1 className="h4">Welcome back, {userName}!</h1>
      <div className="row g-2 my-3">
        {CARDS.map((c) => (
          <div key={c.key} className="col-6 col-md-4">
            <Link to={c.to} className="card text-decoration-none h-100">
              <div className="card-body text-center">
                <div className="h3 mb-0">{metrics[c.key]}</div>
                <div className="text-muted small">{c.label}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <div className="d-flex gap-2 mb-3">
        <Link to="/create" className="btn btn-primary btn-sm">+ Create Ticket</Link>
        <Link to="/tickets" className="btn btn-outline-secondary btn-sm">View My Tickets</Link>
      </div>
      <section aria-label="My Recent Tickets">
        <h2 className="h5">My Recent Tickets</h2>
        {isEmpty && recentTickets.length === 0 ? (
          <p className="text-muted">
            No tickets yet — <Link to="/create">create your first ticket</Link>.
          </p>
        ) : recentTickets.length === 0 ? (
          <p className="text-muted">No recent tickets.</p>
        ) : (
          recentTickets.map((t) => (
            <div key={t.id} className="card mb-2">
              <div className="card-body py-2 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <Link to={`/tickets/${t.id}`}>{t.summary}</Link>
                <span>
                  <span className={`badge badge-status-${t.currentStatus}`}>{t.currentStatus.replace(/_/g, ' ')}</span>{' '}
                  <small className="text-muted">{new Date(t.updatedAt).toLocaleDateString()}</small>
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
