import { useState } from 'react';

import { CreateTicket } from './CreateTicket';
import { RequesterSelection } from './RequesterSelection';
import { RequesterUserProvider, useRequester } from './RequesterUserContext';

export function AppShell() {
  return (
    <RequesterUserProvider>
      <RequesterFlow />
    </RequesterUserProvider>
  );
}

function RequesterFlow() {
  const { requester, setRequester } = useRequester();
  const [view, setView] = useState<'home' | 'create'>('home');

  if (!requester) {
    return <RequesterSelection onContinue={setRequester} />;
  }

  if (view === 'create') {
    return (
      <div>
        <button
          type="button"
          className="btn btn-outline-secondary m-3"
          onClick={() => setView('home')}
        >
          &larr; Back
        </button>
        <CreateTicket requester={requester} />
      </div>
    );
  }

  return (
    <main className="py-5 container" style={{ maxWidth: '42rem' }}>
      <h1 className="h4">TokTickIT</h1>
      <p className="text-muted">
        Signed in as <strong>{requester.name}</strong> ({requester.email})
      </p>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setView('create')}
        >
          Create Ticket
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
  );
}