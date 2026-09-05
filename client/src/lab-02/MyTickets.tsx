import { useEffect, useState } from 'react';

import type { Requester } from './RequesterSelection';

type Ticket = {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority: string;
  ticketDate: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
};

type ReferenceItem = { id: number; name: string };

interface MyTicketsProps {
  requester: Requester;
  onSelectTicket?: (id: number) => void;
}

export function MyTickets({ requester, onSelectTicket }: MyTicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'empty'>('loading');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sort, setSort] = useState('ticketDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [hasUserSorted, setHasUserSorted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);

  useEffect(() => {
    async function loadRefs() {
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/related-systems')
        ]);
        if (catRes.ok) {
          const cats = await catRes.json();
          if (Array.isArray(cats)) setCategories(cats);
        }
        if (sysRes.ok) {
          const sys = await sysRes.json();
          if (Array.isArray(sys)) setSystems(sys);
        }
      } catch {
        // ignore ref load errors
      }
    }
    loadRefs();
  }, []);

  async function loadTickets() {
    setStatus('loading');
    try {
      const params = new URLSearchParams({ requesterId: String(requester.id) });
      if (search.trim()) params.set('search', search.trim());
      if (categoryFilter) params.set('categoryId', categoryFilter);
      if (systemFilter) params.set('relatedSystemId', systemFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      params.set('sort', sort);
      params.set('order', order);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as {
        tickets: Ticket[];
        pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
      };
      setTickets(data.tickets);
      setPagination(data.pagination);
      if (data.tickets.length === 0) {
        // distinguish empty (no tickets at all) vs no-results (search/filter returned 0 but totalItems>0? but we treat same as empty for now)
        // If search/filter active and no results, show no-results, else empty
        const hasActiveFilter = !!(search.trim() || categoryFilter || systemFilter || statusFilter || priorityFilter);
        setStatus(hasActiveFilter ? 'success' : 'empty');
        // For UI tests: empty state expects "No tickets yet", so keep 'empty' when no filter
        if (data.tickets.length === 0 && !hasActiveFilter) setStatus('empty');
        else if (data.tickets.length === 0 && hasActiveFilter) {
          // we will show no-results via filtered check below, keep success to allow no-results rendering
          setStatus('success');
        }
      } else {
        setStatus('success');
      }
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requester.id, page, pageSize, sort, order, search, categoryFilter, systemFilter, statusFilter, priorityFilter]);

  const handleSearch = () => {
    setPage(1);
    loadTickets();
  };

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  // Auto-search is handled via main useEffect dependencies; page reset is done in handlers

  // Determine no-results vs empty for rendering
  const hasActiveFilter = !!(search.trim() || categoryFilter || systemFilter || statusFilter || priorityFilter);
  const showEmpty = status === 'empty' && !hasActiveFilter;
  const showNoResults = status === 'success' && tickets.length === 0 && hasActiveFilter;

  return (
    <main className="container py-4" style={{ maxWidth: '72rem' }}>
      <h1 className="h4 mb-3">My Tickets</h1>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">Search</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
                <input
                  placeholder="Search tickets..."
                  className="form-control"
                  style={{ paddingLeft: '2rem' }}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Category</label>
              <div style={{ position: 'relative' }}>
                <select
                  aria-label="Filter by category"
                  className="form-select"
                  style={{ paddingRight: '2rem' }}
                  value={categoryFilter}
                  onChange={handleFilterChange(setCategoryFilter)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Related System</label>
              <div style={{ position: 'relative' }}>
                <select
                  aria-label="Filter by system"
                  className="form-select"
                  style={{ paddingRight: '2rem' }}
                  value={systemFilter}
                  onChange={handleFilterChange(setSystemFilter)}
                >
                  <option value="">All Systems</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Current Status</label>
              <div style={{ position: 'relative' }}>
              <select
                aria-label="Filter by status"
                className="form-select"
                style={{ paddingRight: '2rem' }}
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On hold</option>
                <option value="PENDING_FOR_APPROVAL">Pending for Approval</option>
                <option value="MONITORING">Monitoring</option>
                <option value="CLOSED">Closed</option>
              </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">Requested Priority</label>
              <div style={{ position: 'relative' }}>
                <select
                  aria-label="Filter by priority"
                  className="form-select"
                  style={{ paddingRight: '2rem' }}
                  value={priorityFilter}
                  onChange={handleFilterChange(setPriorityFilter)}
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {status === 'loading' && <p role="status">Loading tickets...</p>}
      {status === 'error' && <p role="alert" className="text-danger">Unable to load tickets. Please try again.</p>}
      {showEmpty && <p>No tickets yet. Create your first ticket.</p>}
      {showNoResults && <p>No tickets match your search.</p>}

      {status === 'success' && tickets.length > 0 && (
        <>
          <div className="card mb-3" style={{ borderRadius: '0.375rem', overflow: 'hidden' }}>
            <div className="table-responsive mb-0">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr style={{ background: '#EAF6EF' }}>
                    <th style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1' }}>Ticket Number</th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (sort !== 'ticketDate') { setSort('ticketDate'); setOrder('desc'); setHasUserSorted(true); }
                        else if (order === 'desc') setOrder('asc');
                        else setOrder('desc');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (sort !== 'ticketDate') { setSort('ticketDate'); setOrder('desc'); setHasUserSorted(true); }
                          else if (order === 'desc') setOrder('asc');
                          else setOrder('desc');
                        }
                      }}
                      style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Create Date{' '}
                      {sort === 'ticketDate' ? (
                        order === 'asc' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m5 15 7-7 7 7" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m19 9-7 7-7-7" /></svg>
                        )
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
                      )}
                    </th>
                    <th style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1' }}>Summary</th>
                    <th style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1' }}>Category</th>
                    <th style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1' }}>Current Status</th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (sort !== 'requestedPriority') { setSort('requestedPriority'); setOrder('desc'); setHasUserSorted(true); }
                        else if (order === 'desc') setOrder('asc');
                        else setOrder('desc');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (sort !== 'requestedPriority') { setSort('requestedPriority'); setOrder('desc'); setHasUserSorted(true); }
                          else if (order === 'desc') setOrder('asc');
                          else setOrder('desc');
                        }
                      }}
                      style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Priority{' '}
                      {sort === 'requestedPriority' ? (
                        order === 'asc' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m5 15 7-7 7 7" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m19 9-7 7-7-7" /></svg>
                        )
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
                      )}
                    </th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (sort !== 'updatedAt') { setSort('updatedAt'); setOrder('desc'); setHasUserSorted(true); }
                        else if (order === 'desc') setOrder('asc');
                        else setOrder('desc');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (sort !== 'updatedAt') { setSort('updatedAt'); setOrder('desc'); setHasUserSorted(true); }
                          else if (order === 'desc') setOrder('asc');
                          else setOrder('desc');
                        }
                      }}
                      style={{ fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Last Updated{' '}
                      {sort === 'updatedAt' ? (
                        order === 'asc' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m5 15 7-7 7 7" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m19 9-7 7-7-7" /></svg>
                        )
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={onSelectTicket ? 0 : undefined}
                      style={{ cursor: onSelectTicket ? 'pointer' : undefined }}
                      onClick={() => onSelectTicket?.(t.id)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && onSelectTicket) {
                          e.preventDefault();
                          onSelectTicket(t.id);
                        }
                      }}
                    >
                      <td style={{ fontWeight: 500, color: '#006B3C' }}>{t.ticketNumber}</td>
                      <td>{new Date(t.ticketDate).toLocaleString()}</td>
                      <td>{t.summary}</td>
                      <td>{t.category.name}</td>
                    <td><span className={`badge badge-status-${t.currentStatus}`}>{t.currentStatus.replace(/_/g, ' ')}</span></td>
                    <td><span className={`badge badge-priority-${t.requestedPriority}`}>{t.requestedPriority}</span></td>
                      <td>{new Date(t.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} tickets
              </small>
              <div style={{ position: 'relative', width: '120px' }}>
                <select aria-label="Page size" className="form-select form-select-sm" style={{ paddingRight: '1.5rem' }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                </select>
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </div>
            </div>
            <div className="btn-group">
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </button>
              <span className="btn btn-light btn-sm disabled">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {status === 'empty' && null}
    </main>
  );
}