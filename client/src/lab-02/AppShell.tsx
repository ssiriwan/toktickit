import { useState } from 'react';

import { RequesterSelection, type Requester } from './RequesterSelection';
import { RequesterUserProvider } from './RequesterUserContext';

export function AppShell() {
  const [selectedRequester, setSelectedRequester] = useState<Requester | null>(
    null
  );

  return (
    <RequesterUserProvider>
      <RequesterFlow
        selectedRequester={selectedRequester}
        onSelect={setSelectedRequester}
      />
    </RequesterUserProvider>
  );
}

function RequesterFlow({
  selectedRequester,
  onSelect
}: {
  selectedRequester: Requester | null;
  onSelect: (requester: Requester | null) => void;
}) {
  if (selectedRequester) {
    return (
      <main className="py-5 container" style={{ maxWidth: '42rem' }}>
        <h1 className="h4">TokTickIT</h1>
        <p className="text-muted">
          Signed in as <strong>{selectedRequester.name}</strong> (
          {selectedRequester.email})
        </p>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => onSelect(null)}
        >
          Change Requester
        </button>
      </main>
    );
  }

  return <RequesterSelection onContinue={onSelect} />;
}