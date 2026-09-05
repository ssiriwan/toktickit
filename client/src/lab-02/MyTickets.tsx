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
                  <option value="In Progress">In Progress</option>
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
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

      <div className="row g-2">
        <div className="col-12">
          <label className="form-label small text-muted mb-1">Sort by</label>
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted mb-1">Created Date</label>
          <button
            type="button"
            aria-label="Sort by Created Date"
            aria-pressed={hasUserSorted && sort === 'ticketDate'}
            className={`btn w-100 d-flex justify-content-between align-items-center ${hasUserSorted && sort === 'ticketDate' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => {
              if (!hasUserSorted || sort !== 'ticketDate') { setSort('ticketDate'); setOrder('asc'); setHasUserSorted(true); }
              else if (order === 'asc') setOrder('desc');
              else { setSort('ticketDate'); setOrder('desc'); setHasUserSorted(false); }
            }}
          >
            <span>Created Date</span>
            <span style={{ color: hasUserSorted && sort === 'ticketDate' ? '#FFFFFF' : '#6B7280' }}>
              {!hasUserSorted || sort !== 'ticketDate' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
              ) : order === 'asc' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 15 7-7 7 7" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 9-7 7-7-7" /></svg>
              )}
            </span>
          </button>
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted mb-1">Last Updated</label>
          <button
            type="button"
            aria-label="Sort by Last Updated"
            aria-pressed={hasUserSorted && sort === 'updatedAt'}
            className={`btn w-100 d-flex justify-content-between align-items-center ${hasUserSorted && sort === 'updatedAt' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => {
              if (!hasUserSorted || sort !== 'updatedAt') { setSort('updatedAt'); setOrder('asc'); setHasUserSorted(true); }
              else if (order === 'asc') setOrder('desc');
              else { setSort('ticketDate'); setOrder('desc'); setHasUserSorted(false); }
            }}
          >
            <span>Last Updated</span>
            <span style={{ color: hasUserSorted && sort === 'updatedAt' ? '#FFFFFF' : '#6B7280' }}>
              {!hasUserSorted || sort !== 'updatedAt' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
              ) : order === 'asc' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 15 7-7 7 7" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 9-7 7-7-7" /></svg>
              )}
            </span>
          </button>
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted mb-1">Priority</label>
          <button
            type="button"
            aria-label="Sort by Priority"
            aria-pressed={hasUserSorted && sort === 'requestedPriority'}
            className={`btn w-100 d-flex justify-content-between align-items-center ${hasUserSorted && sort === 'requestedPriority' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => {
              if (!hasUserSorted || sort !== 'requestedPriority') { setSort('requestedPriority'); setOrder('asc'); setHasUserSorted(true); }
              else if (order === 'asc') setOrder('desc');
              else { setSort('ticketDate'); setOrder('desc'); setHasUserSorted(false); }
            }}
          >
            <span>Priority</span>
            <span style={{ color: hasUserSorted && sort === 'requestedPriority' ? '#FFFFFF' : '#6B7280' }}>
              {!hasUserSorted || sort !== 'requestedPriority' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
              ) : order === 'asc' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 15 7-7 7 7" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 9-7 7-7-7" /></svg>
              )}
            </span>
          </button>
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted mb-1">Page Size</label>
          <div style={{ position: 'relative' }}>
            <select aria-label="Page size" className="form-select" style={{ paddingRight: '2rem' }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
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
          <div className="table-responsive mb-3">
            <table className="table table-hover align-middle">
              <thead style={{ background: '#F5F7F6' }}>
                <tr>
                  <th>Ticket Number</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Last Updated</th>
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
                    <td><strong>{t.ticketNumber}</strong></td>
                    <td>{t.summary}</td>
                    <td>{t.category.name}</td>
                    <td><span className="badge bg-light text-dark border">{t.currentStatus}</span></td>
                    <td><span className={`badge badge-priority-${t.requestedPriority}`}>{t.requestedPriority}</span></td>
                    <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} tickets
            </small>
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