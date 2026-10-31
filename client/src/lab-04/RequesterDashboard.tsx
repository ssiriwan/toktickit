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
      <div className="row row-cols-2 row-cols-md-5 g-2 my-3 justify-content-center mx-auto" style={{ maxWidth: '52rem' }}>
        {CARDS.map((c) => (
          <div key={c.key} className="col">
            <Link to={c.to} className="card text-decoration-none h-100" style={{ borderRadius: '0.75rem' }}>
              <div className="card-body d-flex flex-column" style={{ minHeight: '7.5rem' }}>
                <div className="text-start small" style={{ color: '#374151', minHeight: '2.8rem' }}>{c.label}</div>
                <div className="h3 mb-0 fw-bold text-start mt-1" style={{ color: '#111' }}>{metrics[c.key]}</div>
                <div className="text-start small mt-auto" style={{ color: 'var(--zen-primary)' }}>View all</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <div className="d-flex gap-2 mb-3 mx-auto ps-1" style={{ maxWidth: '52rem' }}>
        <Link to="/create" className="btn btn-primary btn-sm">+ Create Ticket</Link>
        <Link to="/tickets" className="btn btn-outline-secondary btn-sm">View My Tickets</Link>
      </div>
      <section aria-label="My Recent Tickets" className="card" style={{ borderRadius: '0.75rem' }}>
        <div className="card-body">
          <h2 className="h5">My Recent Tickets</h2>
          {isEmpty && recentTickets.length === 0 ? (
            <p className="text-muted mb-0">
              No tickets yet — <Link to="/create">create your first ticket</Link>.
            </p>
          ) : recentTickets.length === 0 ? (
            <p className="text-muted mb-0">No recent tickets.</p>
          ) : (
            <>
              <div className="row d-none d-md-flex text-muted small border-bottom pb-1 mb-1" aria-hidden="true">
                <div className="col-md-7">Ticket</div>
                <div className="col-md-3">Status</div>
                <div className="col-md-2">Updated</div>
              </div>
              {recentTickets.map((t, i) => (
                <div key={t.id} className={`row py-2 align-items-center${i > 0 ? ' border-top' : ''}`}>
                  <div className="col-12 col-md-7">
                    <Link to={`/tickets/${t.id}`} className="fw-bold text-decoration-none" style={{ color: 'var(--zen-primary)' }}>{t.ticketNumber}</Link>
                    <div style={{ color: '#111' }}>{t.summary}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="d-md-none text-muted small me-1">Status:</span>
                    <span className={`badge badge-status-${t.currentStatus}`}>{t.currentStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="col-6 col-md-2">
                    <span className="d-md-none text-muted small me-1">Updated:</span>
                    <small className="text-muted">{new Date(t.updatedAt).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
