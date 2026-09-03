import { RequesterSelection, type Requester } from './RequesterSelection';
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

  if (requester) {
    return (
      <main className="py-5 container" style={{ maxWidth: '42rem' }}>
        <h1 className="h4">TokTickIT</h1>
        <p className="text-muted">
          Signed in as <strong>{requester.name}</strong> ({requester.email})
        </p>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setRequester(null)}
        >
          Change Requester
        </button>
      </main>
    );
  }

  return <RequesterSelection onContinue={setRequester} />;
}