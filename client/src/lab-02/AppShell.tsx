import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';

import { AuthProvider, useAuth } from '../lab-03/AuthContext';
import { ChangePassword } from '../lab-03/ChangePassword';
import { Login } from '../lab-03/Login';
import { StaffTicketDetail } from '../lab-03/StaffTicketDetail';
import { StaffTicketQueue } from '../lab-03/StaffTicketQueue';
import { UserManagement } from '../lab-03/UserManagement';
import { CreateTicket } from './CreateTicket';
import { MyTickets } from './MyTickets';
import { TicketDetail } from './TicketDetail';

export function AppShell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="zen-header">
      <div className="container d-flex justify-content-between align-items-center w-100" style={{ maxWidth: '1200px' }}>
        <div className="d-flex align-items-center gap-4">
          <Link to="/" className="brand text-decoration-none" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '18px' }}>
            TokTickIT
          </Link>
          <nav className="d-flex gap-3">
            {user.role === 'REQUESTER' && (
              <>
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
              </>
            )}
            {user.role === 'IT_STAFF' && (
              <NavLink
                to="/staff/queue"
                className={({ isActive }) => `nav-link p-0 ${isActive ? 'active' : ''}`}
              >
                My Queue
              </NavLink>
            )}
            {user.role === 'ADMINISTRATOR' && (
              <>
                <NavLink
                  to="/staff/queue"
                  className={({ isActive }) => `nav-link p-0 ${isActive ? 'active' : ''}`}
                >
                  Queue
                </NavLink>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `nav-link p-0 ${isActive ? 'active' : ''}`}
                >
                  Admin
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <small className="d-none d-md-inline">{user.name}</small>
          <span className="badge bg-light text-dark">{user.role}</span>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.5)', background: 'transparent' }}
            onClick={() => navigate('/change-password')}
          >
            Change password
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.5)', background: 'transparent' }}
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <Login
      onLoggedIn={(mustChange) => navigate(mustChange ? '/change-password' : '/', { replace: true })}
    />
  );
}

function AdminRoute({ user }: { user: { id: number; role: string } }) {
  if (user.role !== 'ADMINISTRATOR') {
    return (
      <p role="alert" className="container py-4 text-danger">
        You do not have access to user management.
      </p>
    );
  }
  return <UserManagement currentUserId={user.id} />;
}

function Shell() {
  const { user, authStatus } = useAuth();
  const navigate = useNavigate();

  if (authStatus === 'loading') {
    return (
      <p role="status" className="container py-5">
        Loading...
      </p>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.mustChangePassword) {
    return (
      <Routes>
        <Route
          path="/change-password"
          element={<ChangePassword onChanged={() => navigate('/', { replace: true })} />}
        />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    );
  }

  if (user.role !== 'REQUESTER') {
    return (
      <>
        <Header />
        <Routes>
          <Route
            path="/staff/queue"
            element={<StaffTicketQueue onOpenTicket={(id) => navigate(`/staff/tickets/${id}`)} />}
          />
          <Route
            path="/staff/tickets/:id"
            element={<StaffTicketDetail />}
          />
          <Route path="/admin/users" element={<AdminRoute user={user} />} />
          <Route path="*" element={<Navigate to="/staff/queue" replace />} />
        </Routes>
      </>
    );
  }

  const requester = { id: user.id, name: user.name, email: user.email };

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
        path="/login"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/change-password"
        element={<ChangePassword onChanged={() => navigate('/', { replace: true })} />}
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
      <Route path="/admin/users" element={<AdminRoute user={user} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
