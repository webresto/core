import React, { useState, useEffect, useMemo } from 'react';

const APPEARANCE_STORAGE_KEY = 'appearance';
function getPreferredAppearance() { return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system'; }
function useAppearance() {
  const [appearance, setAppearance] = useState(getPreferredAppearance);
  useEffect(() => {
    const sync = () => setAppearance(getPreferredAppearance());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
    sync();
    window.addEventListener('appearanceChanged', sync);
    window.addEventListener('storage', sync);
    media?.addEventListener('change', sync);
    return () => {
      window.removeEventListener('appearanceChanged', sync);
      window.removeEventListener('storage', sync);
      media?.removeEventListener('change', sync);
    };
  }, []);
}
import { Tabs } from './components/Tabs';
import { SearchBar } from './components/SearchBar';
import { Navigation } from './components/Navigation';
import { LimitedStockSection } from './components/LimitedStockSection';
import { GroupsGrid } from './components/GroupsGrid';
import { DishesGrid } from './components/DishesGrid';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

import { HelpButton } from './components/HelpButton';

// StockManager component with folder navigation and search
// StockManager content component
function StockManagerContent() {
  const { t, language, setLanguage } = useTranslation();
  useAppearance();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Show all dishes state (including disabled and hidden)
  const [showAll, setShowAll] = useState(() => {
    const saved = localStorage.getItem('stockManagerShowAll');
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

  // Persist show all changes
  useEffect(() => {
    localStorage.setItem('stockManagerShowAll', JSON.stringify(showAll));
  }, [showAll]);

  // Parse URL to get current group slug
  function getGroupSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('group') || null;
  }

  function withNoCacheTs(endpoint) {
    const joinChar = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${joinChar}_ts=${Date.now()}`;
  }

  async function fetchJsonNoCache(endpoint, options = {}) {
    const response = await fetch(withNoCacheTs(endpoint), {
      ...options,
      credentials: options.credentials || 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...(options.headers || {}),
      },
    });

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!response.ok || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status}. Expected JSON, got "${contentType || 'unknown'}". ${text.slice(0, 120)}`
      );
    }

    return response.json();
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
      const visitedParents = new Set();

      // Recursive function to search for group and build path
      async function searchGroupRecursive(parentId, pathStack) {
        const parentKey = parentId ? String(parentId) : '__root__';
        if (visitedParents.has(parentKey)) {
          return null;
        }
        visitedParents.add(parentKey);

        const endpoint = `${base}/core/groups${parentId ? `?parent=${parentId}` : ''}`;
        const json = await fetchJsonNoCache(endpoint);
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
      const json = await fetchJsonNoCache(endpoint);
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
      const json = await fetchJsonNoCache(endpoint);
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
      const json = await fetchJsonNoCache(endpoint);
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
    if (!group || (currentGroup && currentGroup.id === group.id)) {
      return;
    }

    const lineage = [...groupStack, currentGroup].filter(Boolean);
    const existingIndex = lineage.findIndex((g) => g.id === group.id);
    if (existingIndex !== -1) {
      const newStack = lineage.slice(0, existingIndex);
      const existingGroup = lineage[existingIndex];
      setGroupStack(newStack);
      setCurrentGroup(existingGroup);
      updateUrl(existingGroup.slug);
      await loadGroups(existingGroup.id);
      await loadDishes(existingGroup.id);
      return;
    }

    setGroupStack(lineage);
    setCurrentGroup(group);
    updateUrl(group.slug);
    await loadGroups(group.id);
    await loadDishes(group.id);
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
      const json = await fetchJsonNoCache(endpoint);
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

  async function handleBreadcrumbNavigate(level) {
    const lineage = [...groupStack, currentGroup].filter(Boolean);

    if (level <= 0) {
      setCurrentGroup(null);
      setGroupStack([]);
      updateUrl(null);
      await loadGroups(null);
      setDishes([]);
      return;
    }

    const targetIndex = level - 1;
    const targetGroup = lineage[targetIndex] || null;
    if (!targetGroup) {
      return;
    }

    const newStack = lineage.slice(0, targetIndex);
    setGroupStack(newStack);
    setCurrentGroup(targetGroup);
    updateUrl(targetGroup.slug);
    await loadGroups(targetGroup.id);
    await loadDishes(targetGroup.id);
  }

  function clearSearch() {
    setQ('');
    setResults([]);
  }

  function handleBalanceChange(id, newBalance) {
    setBalances(prev => ({ ...prev, [id]: newBalance }));
  }

  async function refreshData() {
    setIsRefreshing(true);
    try {
      await loadInitialItems();
      if (currentGroup) {
        await loadDishes(currentGroup.id);
      }
      const term = (q || '').trim();
      if (term) {
        await performSearch(term);
      }
    } finally {
      setIsRefreshing(false);
    }
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
      const json = await fetchJsonNoCache(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ id, balance })
      });
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
        alert(t('Update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('update error', err);
      alert(t('Update error'));
    }
  }



  async function updateVisible(id, model, visible) {
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
      const json = await fetchJsonNoCache(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ id, model, visible })
      });
      if (json.success) {
        // Update state
        if (model === 'dish') {
          setDishes(prev => prev.map(d => d.id === id ? { ...d, visible } : d));
          setInitialItems(prev => prev.map(d => d.id === id ? { ...d, visible } : d));
          setResults(prev => prev.map(d => d.id === id ? { ...d, visible } : d));
        } else if (model === 'group') {
          setGroups(prev => prev.map(g => g.id === id ? { ...g, visible } : g));
        }
      } else {
        alert(t('Visibility update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('update visible error', err);
      alert(t('Visibility update error'));
    }
  }

  async function updateEnable(id, model, enable) {
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
      const json = await fetchJsonNoCache(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xsrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ id, model, enable })
      });
      if (json.success) {
        // Update state
        if (model === 'dish') {
          setDishes(prev => prev.map(d => d.id === id ? { ...d, enable } : d));
          setInitialItems(prev => prev.map(d => d.id === id ? { ...d, enable } : d));
          setResults(prev => prev.map(d => d.id === id ? { ...d, enable } : d));
        } else if (model === 'group') {
          setGroups(prev => prev.map(g => g.id === id ? { ...g, enable } : g));
        }
      } else {
        alert(t('Visibility update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('update enable error', err);
      alert(t('Visibility update error'));
    }
  }

  async function handleBulkEnable(dishIds, enabled) {
    try {
      const promises = dishIds.map(id => updateEnable(id, 'dish', enabled));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk enable error', err);
      alert(t('Bulk visibility update error'));
    }
  }

  async function handleBulkVisibility(dishIds, visible) {
    try {
      const promises = dishIds.map(id => updateVisible(id, 'dish', visible));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk visibility error', err);
      alert(t('Bulk visibility update error'));
    }
  }

  async function handleBulkBalance(dishIds, balance) {
    try {
      // Update all dishes in parallel
      const promises = dishIds.map(id => updateStock(id, balance));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk balance error', err);
      alert(t('Bulk balance update error'));
    }
  }

  const isSearching = (q || '').trim().length > 0;

  const tabs = [
    {
      id: 'out-of-stock',
      label: t('Out of stock'),
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
      label: t('Explore'),
      content: (
        <div>
          <SearchBar query={q} onQueryChange={setQ} onClear={clearSearch} />

          {isSearching ? (
            <DishesGrid
              dishes={results}
              balances={balances}
              onUpdateStock={updateStock}
              onUpdateEnable={updateEnable}
              onUpdateVisible={updateVisible}
              onBalanceChange={handleBalanceChange}
              title={results.length === 0 ? t('No results') : t('Search Results')}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              showAll={showAll}
              onShowAllChange={setShowAll}
            />
          ) : (
            <div>
              <Navigation
                currentGroup={currentGroup}
                groupStack={groupStack}
                onBreadcrumbNavigate={handleBreadcrumbNavigate}
              />

              <GroupsGrid
                groups={groups}
                onGroupClick={handleGroupClick}
                onUpdateVisible={updateVisible}
              />

              <DishesGrid
                dishes={dishes}
                balances={balances}
                onUpdateStock={updateStock}
                onUpdateEnable={updateEnable}
                onUpdateVisible={updateVisible}
                onBalanceChange={handleBalanceChange}
                onBulkEnable={handleBulkEnable}
                onBulkVisibility={handleBulkVisibility}
                onBulkBalance={handleBulkBalance}
                showToolbox={true}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                showAll={showAll}
                onShowAllChange={setShowAll}
              />

              {groups.length === 0 && dishes.length === 0 && (
                <div className="text-center text-muted-foreground py-8">{t('Empty folder')}</div>
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
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{t('Stock Manager')}</h1>
          <HelpButton />
        </div>
        <button
          type="button"
          onClick={refreshData}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          {isRefreshing ? t('Refreshing...') : t('Refresh now')}
        </button>
      </div>
      <Tabs tabs={tabs} defaultTab="out-of-stock" />
    </div>
  );
}

// Main component wrapped with I18nProvider
export default function StockManager(props) {
  return (
    <I18nProvider initialLocale={props.locale} messages={props.messages}>
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
