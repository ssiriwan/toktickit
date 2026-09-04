import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';

import { CreateTicket } from './CreateTicket';
import { MyTickets } from './MyTickets';
import { RequesterSelection } from './RequesterSelection';
import { RequesterUserProvider, useRequester } from './RequesterUserContext';
import { TicketDetail } from './TicketDetail';

export function AppShell() {
  return (
    <BrowserRouter>
      <RequesterUserProvider>
        <RequesterFlow />
      </RequesterUserProvider>
    </BrowserRouter>
  );
}

function TicketDetailRoute({
  requester,
  onBack
}: {
  requester: { id: number; name: string; email: string };
  onBack: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0)
    return (
      <div className="container py-4">
        <p role="alert" className="text-danger">
          Invalid ticket
        </p>
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          &larr; Back to My Tickets
        </button>
      </div>
    );
  return <TicketDetail ticketId={ticketId} requester={requester} onBack={onBack} />;
}

function Header() {
  const { requester, setRequester } = useRequester();
  if (!requester) return null;
  return (
    <header className="zen-header">
      <div className="container d-flex justify-content-between align-items-center w-100" style={{ maxWidth: '1200px' }}>
        <div className="d-flex align-items-center gap-4">
          <Link to="/" className="brand text-decoration-none" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '18px' }}>
            TokTickIT
          </Link>
          <nav className="d-flex gap-3">
            <NavLink
              to="/tickets"
              className={({ isActive }) => `nav-link p-0 ${isActive ? 'active' : ''}`}
            >
              My Tickets
            </NavLink>
            <NavLink
              to="/create"
              className={({ isActive }) => `nav-link p-0 ${isActive ? 'active' : ''}`}
            >
              Create Ticket
            </NavLink>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <small className="d-none d-md-inline">{requester.name}</small>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.5)', background: 'transparent' }}
            onClick={() => setRequester(null)}
          >
            Change Requester
          </button>
        </div>
      </div>
    </header>
  );
}

function RequesterFlow() {
  const { requester, setRequester } = useRequester();
  const navigate = useNavigate();

  if (!requester) {
    return <RequesterSelection onContinue={setRequester} />;
  }

  return (
    <>
      <Header />
      <Routes>
      <Route
        path="/"
        element={
          <main className="py-5 container" style={{ maxWidth: '42rem' }}>
            <h1 className="h4">TokTickIT</h1>
            <p className="text-muted">
              Signed in as <strong>{requester.name}</strong> ({requester.email})
            </p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/create')}
              >
                Create Ticket
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/tickets')}
              >
                My Tickets
              </button>
            </div>
          </main>
        }
      />
      <Route
        path="/create"
        element={
          <div>
            <button
              type="button"
              className="btn btn-outline-secondary m-3"
              onClick={() => navigate('/')}
            >
              &larr; Back
            </button>
            <CreateTicket requester={requester} onViewMyTickets={() => navigate('/tickets')} />
          </div>
        }
      />
      <Route
        path="/tickets"
        element={
          <div>
            <button
              type="button"
              className="btn btn-outline-secondary m-3"
              onClick={() => navigate('/')}
            >
              &larr; Back
            </button>
            <MyTickets
              requester={requester}
              onSelectTicket={(id) => navigate(`/tickets/${id}`)}
            />
          </div>
        }
      />
      <Route
        path="/tickets/:id"
        element={<TicketDetailRoute requester={requester} onBack={() => navigate('/tickets')} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}