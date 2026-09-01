import { useState } from 'react';

const API_URL = 'http://localhost:3000';

type Category = { id: number; name: string };
type SystemStatus = 'idle' | 'loading' | 'online' | 'error';
type CategoryStatus = 'idle' | 'loading' | 'success' | 'error';

export function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('idle');
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatus>('idle');
  const [categories, setCategories] = useState<Category[]>([]);

  async function checkSystem() {
    setSystemStatus('loading');
    setCategoryStatus('loading');
    setCategories([]);

    await checkHealth();
    await loadCategories();
  }

  async function checkHealth() {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Unexpected health check response');
      }
      setSystemStatus('online');
    } catch {
      setSystemStatus('error');
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      if (!response.ok) {
        throw new Error(`Categories request failed: ${response.status}`);
      }
      const data = await response.json();
      setCategories(data);
      setCategoryStatus('success');
    } catch {
      setCategoryStatus('error');
    }
  }

  return (
    <main className="container py-5">
      <section className="mx-auto text-center" style={{ maxWidth: '42rem' }}>
        <h1 className="mb-4">TokTickIT IT Service Desk</h1>
        <button type="button" className="btn btn-primary" onClick={checkSystem}>
          Check System
        </button>

        {systemStatus === 'loading' && (
          <p className="mt-4" role="status">
            Checking system...
            <span
              className="spinner-border spinner-border-sm ms-2"
              aria-hidden="true"
            />
          </p>
        )}
        {systemStatus === 'online' && (
          <p className="mt-4 text-success">System Status: Online</p>
        )}
        {systemStatus === 'error' && (
          <div className="mt-4 text-danger" role="alert">
            <p className="mb-0">System Status: Offline</p>
            <p className="mb-0">Unable to connect to TokTickIT API</p>
          </div>
        )}

        {categoryStatus === 'loading' && (
          <p className="mt-4" role="status">
            Loading categories...
          </p>
        )}
        {categoryStatus === 'success' && (
          <div className="mt-4">
            <h2 className="h5 mb-3">Supported Request Categories</h2>
            <ul className="list-group">
              {categories.map((category) => (
                <li key={category.id} className="list-group-item">
                  {category.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {categoryStatus === 'error' && systemStatus !== 'error' && (
          <p className="mt-4 text-danger" role="alert">
            Unable to load categories. Please make sure the database is
            available.
          </p>
        )}
      </section>
    </main>
  );
}
