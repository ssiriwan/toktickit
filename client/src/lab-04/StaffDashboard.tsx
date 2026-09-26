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
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button>
      </div>
      <div className="row g-2 my-3">
        {CARDS.map((c) => (
          <div key={c.key} className="col-6 col-md-4 col-lg-3">
            <Link to={c.to} className="card text-decoration-none h-100">
              <div className="card-body text-center">
                <div className="h3 mb-0">{metrics[c.key]}</div>
                <div className="text-muted small">{c.label}</div>
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
      <div className="d-flex gap-2 mb-3">
        <Link to="/staff/queue" className="btn btn-primary btn-sm">My Queue</Link>
      </div>
      <section aria-label="Recent Tickets">
        <h2 className="h5">Recent Tickets</h2>
        {recentTickets.length === 0 ? (
          <p className="text-muted">No recent tickets.</p>
        ) : (
          recentTickets.map((t) => (
            <div key={t.id} className="card mb-2">
              <div className="card-body py-2 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <Link to={`/staff/tickets/${t.id}`}>{t.summary}</Link>
                <span>
                  <span className={`badge badge-status-${t.currentStatus}`}>{t.currentStatus.replace(/_/g, ' ')}</span>{' '}
                  <span className={`badge badge-priority-${t.itPriority}`}>{t.itPriority}</span>{' '}
                  <small className="text-muted">{t.owner ? t.owner.name : 'Unassigned'}</small>
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
