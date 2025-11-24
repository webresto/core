import React, { useState, useEffect } from 'react';
import { Tabs } from './components/Tabs';
import { SearchBar } from './components/SearchBar';
import { Navigation } from './components/Navigation';
import { LimitedStockSection } from './components/LimitedStockSection';
import { GroupsGrid } from './components/GroupsGrid';
import { DishesGrid } from './components/DishesGrid';

// StockManager component with folder navigation and search
export default function StockManager() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [balances, setBalances] = useState({});
  const [initialItems, setInitialItems] = useState([]);

  // Navigation state
  const [currentGroup, setCurrentGroup] = useState(null); // null = root
  const [groupStack, setGroupStack] = useState([]); // history of groups
  const [groups, setGroups] = useState([]);
  const [dishes, setDishes] = useState([]);

  // View mode state
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('stockManagerViewMode') || 'grid';
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('stockManagerViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    loadInitialItems();
    loadGroups(null);

    const interval = setInterval(() => {
      loadInitialItems();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const term = (q || '').trim();
    if (!term) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(term);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [q]);

  async function loadInitialItems() {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
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

  async function loadGroups(parentId) {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/groups${parentId ? `?parent=${parentId}` : ''}`;
      const resp = await fetch(endpoint);
      const json = await resp.json();
      setGroups(json.results || []);
    } catch (err) {
      console.error('load groups error', err);
    }
  }

  async function loadDishes(groupId) {
    if (!groupId) {
      setDishes([]);
      return;
    }
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/dishes-by-group?group=${groupId}`;
      const resp = await fetch(endpoint);
      const json = await resp.json();
      const loadedDishes = json.results || [];
      setDishes(loadedDishes);

      const newBalances = {};
      loadedDishes.forEach(r => newBalances[r.id] = r.balance || 0);
      setBalances(prev => ({ ...prev, ...newBalances }));
    } catch (err) {
      console.error('load dishes error', err);
    }
  }

  async function handleGroupClick(group) {
    setGroupStack([...groupStack, currentGroup]);
    setCurrentGroup(group);
    await loadGroups(group.id);
    await loadDishes(group.id);
  }

  async function handleBackClick() {
    if (groupStack.length === 0) {
      // Back to root
      setCurrentGroup(null);
      await loadGroups(null);
      setDishes([]);
      return;
    }

    const prevGroup = groupStack[groupStack.length - 1];
    const newStack = groupStack.slice(0, -1);
    setGroupStack(newStack);
    setCurrentGroup(prevGroup);

    if (prevGroup) {
      await loadGroups(prevGroup.id);
      await loadDishes(prevGroup.id);
    } else {
      await loadGroups(null);
      setDishes([]);
    }
  }

  async function performSearch(term) {
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
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

  function clearSearch() {
    setQ('');
    setResults([]);
  }

  function handleBalanceChange(id, newBalance) {
    setBalances(prev => ({ ...prev, [id]: newBalance }));
  }

  async function updateStock(id, balance) {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
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

        // Refresh data to get latest balances
        loadInitialItems();
        if (currentGroup) {
          loadDishes(currentGroup.id);
        }
        if ((q || '').trim()) {
          performSearch((q || '').trim());
        }
      } else {
        alert('Update failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('update error', err);
      alert('Update error');
    }
  }

  async function updateVisibility(id, model, visible) {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/update-visibility`;
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
        body: JSON.stringify({ id, model, visible })
      });
      const json = await resp.json();
      if (json.success) {
        // Optimistic update or refresh
        if (model === 'dish') {
          setDishes(prev => prev.map(d => d.id === id ? { ...d, visible } : d));
          setInitialItems(prev => prev.map(d => d.id === id ? { ...d, visible } : d));
          setResults(prev => prev.map(d => d.id === id ? { ...d, visible } : d));
        } else if (model === 'group') {
          setGroups(prev => prev.map(g => g.id === id ? { ...g, visible } : g));
        }
      } else {
        alert('Update visibility failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('update visibility error', err);
      alert('Update visibility error');
    }
  }

  async function handleBulkVisibility(dishIds, visible) {
    try {
      // Update all dishes in parallel
      const promises = dishIds.map(id => updateVisibility(id, 'dish', visible));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk visibility error', err);
      alert('Bulk visibility update error');
    }
  }

  async function handleBulkBalance(dishIds, balance) {
    try {
      // Update all dishes in parallel
      const promises = dishIds.map(id => updateStock(id, balance));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk balance error', err);
      alert('Bulk balance update error');
    }
  }

  const isSearching = (q || '').trim().length > 0;

  const tabs = [
    {
      id: 'out-of-stock',
      label: 'Out of stock',
      content: (
        <LimitedStockSection
          items={initialItems}
          balances={balances}
          onUpdateStock={updateStock}
          onUpdateVisibility={updateVisibility}
          onBalanceChange={handleBalanceChange}
        />
      )
    },
    {
      id: 'explore',
      label: 'Explore',
      content: (
        <div>
          <SearchBar query={q} onQueryChange={setQ} onClear={clearSearch} />

          {isSearching ? (
            <DishesGrid
              dishes={results}
              balances={balances}
              onUpdateStock={updateStock}
              onUpdateVisibility={updateVisibility}
              onBalanceChange={handleBalanceChange}
              title={results.length === 0 ? 'No results' : 'Search Results'}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          ) : (
            <div>
              <Navigation
                currentGroup={currentGroup}
                groupStack={groupStack}
                onBackClick={handleBackClick}
              />

              <GroupsGrid
                groups={groups}
                onGroupClick={handleGroupClick}
                onUpdateVisibility={updateVisibility}
              />

              <DishesGrid
                dishes={dishes}
                balances={balances}
                onUpdateStock={updateStock}
                onUpdateVisibility={updateVisibility}
                onBalanceChange={handleBalanceChange}
                onBulkVisibility={handleBulkVisibility}
                onBulkBalance={handleBulkBalance}
                showToolbox={true}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />

              {groups.length === 0 && dishes.length === 0 && (
                <div className="text-center text-gray-500 py-8">Empty folder</div>
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="stock-manager">
      <h1 className="text-2xl font-bold mb-6">Stock Manager</h1>
      <Tabs tabs={tabs} defaultTab="out-of-stock" />
    </div>
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
