import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type QueueTicket = {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority: string;
  itPriority: string;
  ticketDate: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  owner: { id: number; name: string } | null;
};

type Pagination = { page: number; pageSize: number; totalItems: number; totalPages: number };

const STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const OWNERS = [
  { value: '', label: 'All owners' },
  { value: 'me', label: 'Mine' },
  { value: 'unassigned', label: 'Unassigned' }
];

function formatStatus(s: string) {
  return s.replace(/_/g, ' ');
}

function DropdownChevron() {
  return (
    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
    </span>
  );
}

function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m3 8 4-4 4 4" /><path d="m3 16 4 4 4-4" /></svg>
    );
  }
  return order === 'asc' ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m5 15 7-7 7 7" /></svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="m19 9-7 7-7-7" /></svg>
  );
}

export function StaffTicketQueue({
  readOnly,
  onOpenTicket
}: {
  readOnly: boolean;
  onOpenTicket: (id: number) => void;
}) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
  const [status, setStatus] = useState<'loading' | 'loaded' | 'empty' | 'forbidden' | 'error'>('loading');
  const [noResults, setNoResults] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [reqPriority, setReqPriority] = useState('');
  const [itPriority, setItPriority] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sort, setSort] = useState('updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [retryTick, setRetryTick] = useState(0);
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [systems, setSystems] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function loadRefs() {
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch('/api/categories', { credentials: 'include' }),
          fetch('/api/related-systems', { credentials: 'include' })
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
        // reference data is optional for filtering
      }
    }
    loadRefs();
  }, []);

  const hasActiveFilter = !!(
    debouncedSearch ||
    statusFilter ||
    categoryFilter ||
    systemFilter ||
    reqPriority ||
    itPriority ||
    ownerFilter
  );

  useEffect(() => {
    async function load() {
      setStatus('loading');
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);
        if (systemFilter) params.set('relatedSystemId', systemFilter);
        if (reqPriority) params.set('reqPriority', reqPriority);
        if (itPriority) params.set('itPriority', itPriority);
        if (ownerFilter) params.set('owner', ownerFilter);
        params.set('sort', sort);
        params.set('order', order);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        const res = await fetch(`/api/staff/tickets?${params.toString()}`, { credentials: 'include' });
        if (res.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        if (res.status === 403) {
          setStatus('forbidden');
          return;
        }
        if (!res.ok) throw new Error('Failed');
        const data = (await res.json()) as { tickets: QueueTicket[]; pagination: Pagination };
        setTickets(data.tickets);
        setPagination(data.pagination);
        if (data.tickets.length === 0) {
          setNoResults(hasActiveFilter);
          setStatus('empty');
        } else {
          setNoResults(false);
          setStatus('loaded');
        }
      } catch {
        setStatus('error');
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, categoryFilter, systemFilter, reqPriority, itPriority, ownerFilter, sort, order, page, pageSize, retryTick]);

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setSystemFilter('');
    setReqPriority('');
    setItPriority('');
    setOwnerFilter('');
    setPage(1);
  }

  function handleSortClick(key: string) {
    if (sort !== key) {
      setSort(key);
      setOrder('desc');
    } else if (order === 'desc') {
      setOrder('asc');
    } else {
      setOrder('desc');
    }
  }

  function sortHeaderProps(key: string) {
    return {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => handleSortClick(key),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSortClick(key);
        }
      },
      style: { fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1', cursor: 'pointer', userSelect: 'none' as const }
    };
  }

  const headerCell: React.CSSProperties = { fontWeight: 500, color: '#006B3C', background: '#EAF6EF', borderBottom: '1px solid #E0E4E1' };

  if (status === 'loading') return <p role="status">Loading queue...</p>;
  if (status === 'forbidden')
    return (
      <p role="alert" className="text-danger">
        You do not have access to the staff queue.
      </p>
    );
  if (status === 'error')
    return (
      <div>
        <p role="alert" className="text-danger">
          Unable to load the queue. Please try again.
        </p>
        <button type="button" className="btn btn-outline-secondary" onClick={() => setRetryTick((t) => t + 1)}>
          Retry
        </button>
      </div>
    );

  const from = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <main className="container py-4" style={{ maxWidth: '72rem' }}>
      <h1 className="h4 mb-3">
        Staff Ticket Queue{' '}
        {readOnly && <span className="badge bg-secondary">Read-only</span>}
      </h1>

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
                  placeholder="Search by ticket number, summary, or description..."
                  aria-label="Search queue"
                  className="form-control"
                  style={{ paddingLeft: '2rem' }}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1" htmlFor="q-status">Status</label>
              <div style={{ position: 'relative' }}>
                <select id="q-status" className="form-select" style={{ paddingRight: '2rem' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1" htmlFor="q-category">Category</label>
              <div style={{ position: 'relative' }}>
                <select id="q-category" className="form-select" style={{ paddingRight: '2rem' }} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1" htmlFor="q-system">Related system</label>
              <div style={{ position: 'relative' }}>
                <select id="q-system" className="form-select" style={{ paddingRight: '2rem' }} value={systemFilter} onChange={(e) => { setSystemFilter(e.target.value); setPage(1); }}>
                  <option value="">All systems</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1" htmlFor="q-reqpri">Requested priority</label>
              <div style={{ position: 'relative' }}>
                <select id="q-reqpri" className="form-select" style={{ paddingRight: '2rem' }} value={reqPriority} onChange={(e) => { setReqPriority(e.target.value); setPage(1); }}>
                  <option value="">All</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1" htmlFor="q-itpri">IT priority</label>
              <div style={{ position: 'relative' }}>
                <select id="q-itpri" className="form-select" style={{ paddingRight: '2rem' }} value={itPriority} onChange={(e) => { setItPriority(e.target.value); setPage(1); }}>
                  <option value="">All</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1" htmlFor="q-owner">Owner</label>
              <div style={{ position: 'relative' }}>
                <select id="q-owner" className="form-select" style={{ paddingRight: '2rem' }} value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}>
                  {OWNERS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <DropdownChevron />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted" role="status">
        Showing {from} to {to} of {pagination.totalItems} tickets
      </p>

      {status === 'empty' && !noResults && <p className="text-muted">No tickets yet.</p>}
      {status === 'empty' && noResults && (
        <div>
          <p className="text-muted">No tickets match your filters.</p>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {tickets.length > 0 && (
        <>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover">
              <thead>
                <tr style={{ background: '#EAF6EF' }}>
                  <th style={headerCell}>Ticket No.</th>
                  <th {...sortHeaderProps('ticketDate')}>
                    Created Date{' '}<SortIcon active={sort === 'ticketDate'} order={order} />
                  </th>
                  <th style={headerCell}>Summary</th>
                  <th style={headerCell}>Category</th>
                  <th {...sortHeaderProps('requestedPriority')}>
                    Req. Priority{' '}<SortIcon active={sort === 'requestedPriority'} order={order} />
                  </th>
                  <th {...sortHeaderProps('itPriority')}>
                    IT Priority{' '}<SortIcon active={sort === 'itPriority'} order={order} />
                  </th>
                  <th style={headerCell}>Status</th>
                  <th style={headerCell}>Owner</th>
                  <th {...sortHeaderProps('updatedAt')}>
                    Updated{' '}<SortIcon active={sort === 'updatedAt'} order={order} />
                  </th>
                  <th style={headerCell} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.ticketNumber}</td>
                    <td>{new Date(t.ticketDate).toLocaleDateString()}</td>
                    <td style={{ maxWidth: '16rem' }} title={t.summary}>
                      <span className="d-inline-block text-truncate" style={{ maxWidth: '16rem' }}>{t.summary}</span>
                    </td>
                    <td>{t.category.name}</td>
                    <td><span className={`badge badge-priority-${t.requestedPriority}`}>{t.requestedPriority}</span></td>
                    <td><span className={`badge badge-priority-${t.itPriority}`}>{t.itPriority}</span></td>
                    <td><span className={`badge badge-status-${t.currentStatus}`}>{formatStatus(t.currentStatus)}</span></td>
                    <td>{t.owner ? t.owner.name : <span className="text-muted">Unassigned</span>}</td>
                    <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenTicket(t.id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none">
            {tickets.map((t) => (
              <div key={t.id} className="card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong>{t.ticketNumber}</strong>
                    <span className={`badge badge-status-${t.currentStatus}`}>{formatStatus(t.currentStatus)}</span>
                  </div>
                  <p className="mb-1">{t.summary}</p>
                  <small className="text-muted d-block">{t.category.name} • {new Date(t.ticketDate).toLocaleDateString()}</small>
                  <small className="text-muted d-block">Updated {new Date(t.updatedAt).toLocaleDateString()}</small>
                  <div className="d-flex gap-1 my-2">
                    <span className={`badge badge-priority-${t.requestedPriority}`}>{t.requestedPriority}</span>
                    <span className={`badge badge-priority-${t.itPriority}`}>{t.itPriority}</span>
                    <span className="badge bg-light text-dark">{t.owner ? t.owner.name : 'Unassigned'}</span>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm w-100" onClick={() => onOpenTicket(t.id)}>
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex align-items-center gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span aria-label="Page info">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
            <select
              className="form-select form-select-sm w-auto ms-2"
              aria-label="Page size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 25].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>
        </>
      )}
    </main>
  );
}
