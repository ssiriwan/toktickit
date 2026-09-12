import { useEffect, useState } from 'react';

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
  const [order, setOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
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
        if (res.status === 401 || res.status === 403) {
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
  }, [debouncedSearch, statusFilter, categoryFilter, systemFilter, reqPriority, itPriority, ownerFilter, sort, order, page, pageSize]);

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
        <button type="button" className="btn btn-outline-secondary" onClick={() => setPage((p) => p)}>
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

      <div className="d-flex gap-2 mb-2">
        <input
          className="form-control"
          placeholder="Search by ticket number, summary, or description..."
          aria-label="Search queue"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          Filters
        </button>
      </div>

      {showFilters && (
        <section className="card mb-3" aria-label="Queue filters">
          <div className="card-body row g-2">
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-status">Status</label>
              <select id="q-status" className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-category">Category</label>
              <select id="q-category" className="form-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-system">Related system</label>
              <select id="q-system" className="form-select" value={systemFilter} onChange={(e) => { setSystemFilter(e.target.value); setPage(1); }}>
                <option value="">All systems</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-reqpri">Requested priority</label>
              <select id="q-reqpri" className="form-select" value={reqPriority} onChange={(e) => { setReqPriority(e.target.value); setPage(1); }}>
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-itpri">IT priority</label>
              <select id="q-itpri" className="form-select" value={itPriority} onChange={(e) => { setItPriority(e.target.value); setPage(1); }}>
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-owner">Owner</label>
              <select id="q-owner" className="form-select" value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}>
                {OWNERS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-sort">Sort by</label>
              <select id="q-sort" className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="updatedAt">Last updated</option>
                <option value="ticketDate">Created date</option>
                <option value="requestedPriority">Requested priority</option>
                <option value="itPriority">IT priority</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="q-order">Order</label>
              <select id="q-order" className="form-select" value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          </div>
        </section>
      )}

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
                <tr>
                  <th>Ticket No.</th>
                  <th>Created Date</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Req. Priority</th>
                  <th>IT Priority</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.ticketNumber}</td>
                    <td>{new Date(t.ticketDate).toLocaleString()}</td>
                    <td style={{ maxWidth: '16rem' }} title={t.summary}>
                      <span className="d-inline-block text-truncate" style={{ maxWidth: '16rem' }}>{t.summary}</span>
                    </td>
                    <td>{t.category.name}</td>
                    <td><span className={`badge badge-priority-${t.requestedPriority}`}>{t.requestedPriority}</span></td>
                    <td><span className={`badge badge-priority-${t.itPriority}`}>{t.itPriority}</span></td>
                    <td><span className={`badge badge-status-${t.currentStatus}`}>{formatStatus(t.currentStatus)}</span></td>
                    <td>{t.owner ? t.owner.name : <span className="text-muted">Unassigned</span>}</td>
                    <td>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onOpenTicket(t.id)}>
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
                  <div className="d-flex gap-1 my-2">
                    <span className={`badge badge-priority-${t.requestedPriority}`}>{t.requestedPriority}</span>
                    <span className={`badge badge-priority-${t.itPriority}`}>{t.itPriority}</span>
                    <span className="badge bg-light text-dark">{t.owner ? t.owner.name : 'Unassigned'}</span>
                  </div>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onOpenTicket(t.id)}>
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
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>
        </>
      )}
    </main>
  );
}
