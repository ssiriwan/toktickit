import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { CreateTicket } from './CreateTicket';
import { MyTickets } from './MyTickets';
import { RequesterSelection } from './RequesterSelection';
import { RequesterUserProvider, useRequester } from './RequesterUserContext';

export function AppShell() {
  return (
    <BrowserRouter>
      <RequesterUserProvider>
        <RequesterFlow />
      </RequesterUserProvider>
    </BrowserRouter>
  );
}

function RequesterFlow() {
  const { requester, setRequester } = useRequester();
  const navigate = useNavigate();

  if (!requester) {
    return <RequesterSelection onContinue={setRequester} />;
  }

  return (
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
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setRequester(null)}
              >
                Change Requester
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
            <MyTickets requester={requester} />
          </div>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}