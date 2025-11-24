import React, { useState, useEffect } from 'react';
import { Tabs } from './components/Tabs';
import { SearchBar } from './components/SearchBar';
import { Navigation } from './components/Navigation';
import { LimitedStockSection } from './components/LimitedStockSection';
import { GroupsGrid } from './components/GroupsGrid';
import { DishesGrid } from './components/DishesGrid';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

// StockManager component with folder navigation and search
// StockManager content component
function StockManagerContent() {
  const { t, language, setLanguage } = useTranslation();
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // View mode state
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('stockManagerViewMode') || 'grid';
  });

  // Sort mode state
  const [sortMode, setSortMode] = useState(() => {
    return localStorage.getItem('stockManagerSortMode') || 'status';
  });

  // Show deleted dishes state
  const [showDeleted, setShowDeleted] = useState(() => {
    const saved = localStorage.getItem('stockManagerShowDeleted');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('stockManagerViewMode', viewMode);
  }, [viewMode]);

  // Persist sort mode changes
  useEffect(() => {
    localStorage.setItem('stockManagerSortMode', sortMode);
  }, [sortMode]);

  // Persist show deleted changes
  useEffect(() => {
    localStorage.setItem('stockManagerShowDeleted', JSON.stringify(showDeleted));
  }, [showDeleted]);

  // Parse URL to get current group slug
  function getGroupSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('group') || null;
  }

  // Update URL with current group slug
  function updateUrl(groupSlug) {
    const url = new URL(window.location);
    if (groupSlug) {
      url.searchParams.set('group', groupSlug);
    } else {
      url.searchParams.delete('group');
    }
    window.history.pushState({}, '', url);
  }

  // Load group by slug with recursive search and build navigation stack
  async function loadGroupBySlug(slug) {
    if (!slug) return null;

    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');

      // Recursive function to search for group and build path
      async function searchGroupRecursive(parentId, pathStack) {
        const endpoint = `${base}/core/groups${parentId ? `?parent=${parentId}` : ''}`;
        const resp = await fetch(endpoint);
        const json = await resp.json();
        const groups = json.results || [];

        // Check if target group is in current level
        const targetGroup = groups.find(g => g.slug === slug);
        if (targetGroup) {
          return {
            group: targetGroup,
            stack: pathStack
          };
        }

        // Search in child groups
        for (const group of groups) {
          const result = await searchGroupRecursive(group.id, [...pathStack, group]);
          if (result) {
            return result;
          }
        }

        return null;
      }

      // Start search from root
      const result = await searchGroupRecursive(null, []);
      return result;

    } catch (err) {
      console.error('load group by slug error', err);
      return null;
    }
  }

  // Initial load: check URL for group slug
  useEffect(() => {
    async function initializeFromUrl() {
      loadInitialItems();

      const groupSlug = getGroupSlugFromUrl();
      if (groupSlug) {
        const result = await loadGroupBySlug(groupSlug);
        if (result) {
          setCurrentGroup(result.group);
          setGroupStack(result.stack);
          await loadGroups(result.group.id);
          await loadDishes(result.group.id);
        } else {
          // Group not found, load root
          await loadGroups(null);
        }
      } else {
        await loadGroups(null);
      }

      setIsInitialLoad(false);
    }

    initializeFromUrl();

    const interval = setInterval(() => {
      loadInitialItems();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    async function handlePopState() {
      const groupSlug = getGroupSlugFromUrl();
      if (groupSlug) {
        const result = await loadGroupBySlug(groupSlug);
        if (result) {
          setCurrentGroup(result.group);
          setGroupStack(result.stack);
          await loadGroups(result.group.id);
          await loadDishes(result.group.id);
        }
      } else {
        setCurrentGroup(null);
        setGroupStack([]);
        await loadGroups(null);
        setDishes([]);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
    updateUrl(group.slug);
    await loadGroups(group.id);
    await loadDishes(group.id);
  }

  async function handleBackClick() {
    if (groupStack.length === 0) {
      // Back to root
      setCurrentGroup(null);
      updateUrl(null);
      await loadGroups(null);
      setDishes([]);
      return;
    }

    const prevGroup = groupStack[groupStack.length - 1];
    const newStack = groupStack.slice(0, -1);
    setGroupStack(newStack);
    setCurrentGroup(prevGroup);

    if (prevGroup) {
      updateUrl(prevGroup.slug);
      await loadGroups(prevGroup.id);
      await loadDishes(prevGroup.id);
    } else {
      updateUrl(null);
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



  async function updateIsDeleted(id, model, isDeleted) {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/update-is-deleted`;
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
        body: JSON.stringify({ id, model, isDeleted })
      });
      const json = await resp.json();
      if (json.success) {
        // Update state
        if (model === 'dish') {
          setDishes(prev => prev.map(d => d.id === id ? { ...d, isDeleted } : d));
          setInitialItems(prev => prev.map(d => d.id === id ? { ...d, isDeleted } : d));
          setResults(prev => prev.map(d => d.id === id ? { ...d, isDeleted } : d));
        } else if (model === 'group') {
          setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted } : g));
        }
      } else {
        alert('Update isDeleted failed: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('update isDeleted error', err);
      alert('Update isDeleted error');
    }
  }

  async function handleBulkVisibility(dishIds, visible) {
    try {
      // Update all dishes in parallel
      // visible = true => isDeleted = false
      // visible = false => isDeleted = true
      const isDeleted = !visible;
      const promises = dishIds.map(id => updateIsDeleted(id, 'dish', isDeleted));
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
      label: t('tab_out_of_stock'),
      content: (
        <LimitedStockSection
          items={initialItems}
          balances={balances}
          onUpdateStock={updateStock}
          onBalanceChange={handleBalanceChange}
        />
      )
    },
    {
      id: 'explore',
      label: t('tab_explore'),
      content: (
        <div>
          <SearchBar query={q} onQueryChange={setQ} onClear={clearSearch} />

          {isSearching ? (
            <DishesGrid
              dishes={results}
              balances={balances}
              onUpdateStock={updateStock}
              onUpdateIsDeleted={updateIsDeleted}
              onBalanceChange={handleBalanceChange}
              title={results.length === 0 ? t('no_results') : t('search_results')}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
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
              />

              <DishesGrid
                dishes={dishes}
                balances={balances}
                onUpdateStock={updateStock}
                onUpdateIsDeleted={updateIsDeleted}
                onBalanceChange={handleBalanceChange}
                onBulkVisibility={handleBulkVisibility}
                onBulkBalance={handleBulkBalance}
                showToolbox={true}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                showDeleted={showDeleted}
                onShowDeletedChange={setShowDeleted}
              />

              {groups.length === 0 && dishes.length === 0 && (
                <div className="text-center text-gray-500 py-8">{t('empty_folder')}</div>
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Manager</h1>
      </div>
      <Tabs tabs={tabs} defaultTab="out-of-stock" />
    </div>
  );
}

// Main component wrapped with I18nProvider
export default function StockManager(props) {
  return (
    <I18nProvider initialLocale={props.locale}>
      <StockManagerContent />
    </I18nProvider>
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
