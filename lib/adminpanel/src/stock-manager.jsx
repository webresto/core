import React, { useState, useEffect } from 'react';

// Minimal React component with search for StockManager
export default function StockManager() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [balances, setBalances] = useState({});
  const [initialItems, setInitialItems] = useState([]);

  useEffect(() => {
    loadInitialItems();
  }, []);

  async function loadInitialItems() {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/,'');
      const endpoint = `${base}/core/stock-items`;
      const resp = await fetch(endpoint);
      const json = await resp.json();
      setInitialItems(json.results || []);
      const newBalances = {};
      (json.results || []).forEach(r => newBalances[r.id] = r.balance || 0);
      setBalances(prev => ({ ...prev, ...newBalances }));
    } catch (err) {
      console.error('load initial items error', err);
    }
  }

  async function doSearch(e) {
    e && e.preventDefault();
    const term = (q || '').trim();
    if (!term) return setResults([]);
    setLoading(true);
    try {
      // Compute admin-scoped API path relative to current page.
      // If component is mounted on e.g. `/admin/stock-manager`, base will be `/admin` and endpoint -> `/admin/core/api`.
      const base = (window.location.pathname || '').replace(/\/[^/]*$/,'');
      const endpoint = `${base}/core/api?q=${encodeURIComponent(term)}`;
      const resp = await fetch(endpoint);
      const json = await resp.json();
      setResults(json.results || []);
      const newBalances = {};
      (json.results || []).forEach(r => newBalances[r.id] = r.balance || 0);
      setBalances(prev => ({ ...prev, ...newBalances }));
    } catch (err) {
      console.error('search error', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStock(id, balance) {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/,'');
      const endpoint = `${base}/core/update-stock`;
      const csrfToken = (() => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'XSRF-TOKEN') return decodeURIComponent(value);
        }
        return null;
      })();
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ id, balance })
      });
      const json = await resp.json();
      if (json.success) {
        setBalances(prev => ({ ...prev, [id]: balance }));
        alert('Stock updated');
      } else {
        alert('Update failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('update error', err);
      alert('Update error');
    }
  }

  return React.createElement('div', { className: 'stock-manager' },
    React.createElement('h1', null, 'Stock Manager'),
    initialItems.length > 0 && React.createElement('div', null,
      React.createElement('h2', null, 'Items with limited stock'),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: 20 } },
        initialItems.map((r) => (
          React.createElement('div', { key: r.id, style: { border: '1px solid #ddd', padding: 16, borderRadius: 8, backgroundColor: '#f9f9f9' } },
            React.createElement('div', { style: { fontWeight: 'bold', marginBottom: 8 } }, r.name || '—'),
            React.createElement('div', { style: { marginBottom: 4 } }, `Code: ${r.code || ''}`),
            React.createElement('div', { style: { marginBottom: 4 } }, `Price: ${r.price ?? ''}`),
            React.createElement('div', { style: { marginBottom: 8 } }, 'Stock: ', React.createElement('input', {
            type: 'number',
            value: balances[r.id] ?? r.balance ?? 0,
            readOnly: true,
            style: { width: 80, border: 'none', background: 'transparent' }
          })),
            React.createElement('div', null,
              React.createElement('input', {
                type: 'number',
                value: balances[r.id] ?? r.balance ?? 0,
                onChange: (ev) => { console.log('changed', r.id, ev.target.value); setBalances({ ...balances, [r.id]: Number(ev.target.value) || 0 }); },
                style: { width: 80, marginRight: 8, padding: '4px' }
              }),
              React.createElement('button', { onClick: () => updateStock(r.id, balances[r.id] ?? r.balance ?? 0), style: { padding: '4px 8px' } }, 'Update')
            )
          )
        ))
      )
    ),
    React.createElement('form', { onSubmit: doSearch, style: { marginBottom: 12 } },
      React.createElement('input', {
        type: 'search',
        placeholder: 'Search by code or name',
        value: q,
        onChange: (ev) => setQ(ev.target.value),
        style: { padding: '6px 8px', width: 300, marginRight: 8 }
      }),
      React.createElement('button', { type: 'submit', disabled: loading }, loading ? 'Searching...' : 'Search')
    ),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' } },
      results.length === 0 ? React.createElement('div', null, 'No results') : results.map((r) => (
        React.createElement('div', { key: r.id, style: { border: '1px solid #ddd', padding: 16, borderRadius: 8, backgroundColor: '#f9f9f9' } },
          React.createElement('div', { style: { fontWeight: 'bold', marginBottom: 8 } }, r.name || '—'),
          React.createElement('div', { style: { marginBottom: 4 } }, `Code: ${r.code || ''}`),
          React.createElement('div', { style: { marginBottom: 4 } }, `Price: ${r.price ?? ''}`),
          React.createElement('div', { style: { marginBottom: 8 } }, 'Stock: ', React.createElement('input', {
          type: 'number',
          value: balances[r.id] ?? r.balance ?? 0,
          readOnly: true,
          style: { width: 80, border: 'none', background: 'transparent' }
        })),
          React.createElement('div', null,
            React.createElement('input', {
              type: 'number',
              value: balances[r.id] ?? r.balance ?? 0,
              onChange: (ev) => { console.log('changed', r.id, ev.target.value); setBalances({ ...balances, [r.id]: Number(ev.target.value) || 0 }); },
              style: { width: 80, marginRight: 8, padding: '4px' }
            }),
            React.createElement('button', { onClick: () => updateStock(r.id, balances[r.id] ?? r.balance ?? 0), style: { padding: '4px 8px' } }, 'Update')
          )
        )
      ))
    )
  );
}

// Also expose a mount helper for non-ESM consumers (optional)
if (typeof window !== 'undefined') {
  window.StockManager = window.StockManager || {};
  window.StockManager.Component = StockManager;
  window.StockManager.mount = (el = null) => {
    try {
      const target = el || document.getElementById('stock-manager-root') || (() => {
        const d = document.createElement('div'); d.id = 'stock-manager-root'; (document.querySelector('#app') || document.body).appendChild(d); return d;
      })();
      // hydrate or render depending on env; avoid adding react-dom import to keep bundle small
      if (window.ReactDOM && window.ReactDOM.render) {
        window.ReactDOM.render(React.createElement(StockManager), target);
      } else if (window.ReactDOM && window.ReactDOM.hydrateRoot) {
        // React 18 hydration API
        window.ReactDOM.hydrateRoot(target, React.createElement(StockManager));
      }
    } catch (e) {
      // noop
      // console.error('StockManager mount error', e)
    }
  };
}
