import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface StaffMetrics {
  newCount: number;
  openCount: number;
  inProgressCount: number;
  waitingForRequesterCount: number;
  myAssignedCount: number;
  unassignedCount: number;
  urgentCount: number;
}

interface UserSummary {
  totalUsers: number;
  activeRequesters: number;
  activeStaff: number;
  activeAdmins: number;
  inactiveUsers: number;
}

interface RecentTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  itPriority: string;
  updatedAt: string;
  owner: { id: number; name: string } | null;
}

const CARDS: { key: keyof StaffMetrics; label: string; to: string }[] = [
  { key: 'newCount', label: 'New', to: '/staff/queue?status=NEW' },
  { key: 'openCount', label: 'Open', to: '/staff/queue?status=OPEN' },
  { key: 'inProgressCount', label: 'In Progress', to: '/staff/queue?status=IN_PROGRESS' },
  { key: 'waitingForRequesterCount', label: 'Waiting for Requester', to: '/staff/queue?status=WAITING_FOR_REQUESTER' },
  { key: 'myAssignedCount', label: 'My Assigned', to: '/staff/queue?owner=me' },
  { key: 'unassignedCount', label: 'Unassigned', to: '/staff/queue?owner=unassigned' },
  { key: 'urgentCount', label: 'Urgent', to: '/staff/queue?itPriority=URGENT' }
];

export function StaffDashboard({ userName, role }: { userName: string; role: 'IT_STAFF' | 'ADMINISTRATOR' }) {
  const [metrics, setMetrics] = useState<StaffMetrics | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

  const url = role === 'ADMINISTRATOR' ? '/api/admin/dashboard' : '/api/staff/dashboard';

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as {
        metrics: StaffMetrics;
        recentTickets: RecentTicket[];
        userSummary?: UserSummary;
      };
      setMetrics(data.metrics);
      setRecentTickets(Array.isArray(data.recentTickets) ? data.recentTickets : []);
      setUserSummary(data.userSummary ?? null);
      setState('success');
    } catch {
      setState('error');
    }
  }, [url]);

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

  return (
    <main className="container py-4" style={{ maxWidth: '64rem' }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h1 className="h4 mb-0">Welcome back, {userName}!</h1>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="me-1" style={{ verticalAlign: '-2px' }}>
            <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89" />
            <path d="M13.5 1.5v3h-3" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="row g-2 my-3 justify-content-center mx-auto" style={{ maxWidth: '52rem' }}>
        {CARDS.map((c) => (
          <div key={c.key} className="col-6 col-md-4 col-lg-3">
            <Link to={c.to} className="card text-decoration-none h-100" style={{ borderRadius: '0.75rem' }}>
              <div className="card-body d-flex flex-column" style={{ minHeight: '7.5rem' }}>
                <div className="text-start small" style={{ color: '#374151', minHeight: '1.4rem' }}>{c.label}</div>
                <div className="h3 mb-0 fw-bold text-start mt-1" style={{ color: '#111' }}>{metrics[c.key]}</div>
                <div className="text-start small mt-auto" style={{ color: 'var(--zen-primary)' }}>View all</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      {userSummary && (
        <section aria-label="User Summary" className="card mb-3">
          <div className="card-body d-flex gap-3 flex-wrap align-items-center">
            <strong>User Summary</strong>
            <span className="text-muted small">Total {userSummary.totalUsers}</span>
            <span className="text-muted small">Requesters {userSummary.activeRequesters}</span>
            <span className="text-muted small">Staff {userSummary.activeStaff}</span>
            <span className="text-muted small">Admins {userSummary.activeAdmins}</span>
            <Link to="/admin/users" className="btn btn-outline-secondary btn-sm ms-auto">Admin users</Link>
          </div>
        </section>
      )}
      <section aria-label="Recent Tickets" className="card" style={{ borderRadius: '0.75rem' }}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <h2 className="h5 mb-0">Recent Tickets</h2>
            <Link to="/staff/queue?owner=me" className="small text-decoration-none ms-auto" style={{ color: 'var(--zen-primary)', fontWeight: 600 }}>View my tickets</Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-muted mb-0">No recent tickets.</p>
          ) : (
            <>
              <div className="row d-none d-md-flex text-muted small border-bottom pb-1 mb-1" aria-hidden="true">
                <div className="col-md-4">Ticket</div>
                <div className="col-md-2">IT Priority</div>
                <div className="col-md-2">Status</div>
                <div className="col-md-2">Owner</div>
                <div className="col-md-2">Last Updated</div>
              </div>
              {recentTickets.map((t, i) => (
                <div key={t.id} className={`row py-2 align-items-center${i > 0 ? ' border-top' : ''}`}>
                  <div className="col-12 col-md-4">
                    <Link to={`/staff/tickets/${t.id}`} className="fw-bold text-decoration-none" style={{ color: 'var(--zen-primary)' }}>{t.ticketNumber}</Link>
                    <div>{t.summary}</div>
                  </div>
                  <div className="col-6 col-md-2">
                    <span className="d-md-none text-muted small me-1">Priority:</span>
                    <span className={`badge badge-priority-${t.itPriority}`}>{t.itPriority}</span>
                  </div>
                  <div className="col-6 col-md-2">
                    <span className="d-md-none text-muted small me-1">Status:</span>
                    <span className={`badge badge-status-${t.currentStatus}`}>{t.currentStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="col-6 col-md-2">
                    <span className="d-md-none text-muted small me-1">Owner:</span>
                    <small className="text-muted">{t.owner ? t.owner.name : 'Unassigned'}</small>
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
