import React, { useState, useEffect, useMemo, useRef } from 'react';

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

const { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } = window.UIComponents;

const TAB_OUT_OF_STOCK = 'out-of-stock';
const TAB_EXPLORE = 'explore';
const TAB_IDS = [TAB_OUT_OF_STOCK, TAB_EXPLORE];

function readTabFromUrl() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  return TAB_IDS.includes(hash) ? hash : TAB_OUT_OF_STOCK;
}

// StockManager component with folder navigation and search
// StockManager content component
function StockManagerContent({ canManage = false }) {
  const { t, language, setLanguage } = useTranslation();
  useAppearance();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [results, setResults] = useState([]);
  const [localBalances, setLocalBalances] = useState({});
  const [balanceMode, setBalanceMode] = useState('minimum');
  const [initialItems, setInitialItems] = useState([]);
  const [places, setPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [activeTab, setActiveTab] = useState(readTabFromUrl);
  const accessRecoveryRef = useRef(false);

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
    return localStorage.getItem('stockManagerSortMode') || 'name-asc';
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
      const error = new Error(
        `HTTP ${response.status}. Expected JSON, got "${contentType || 'unknown'}". ${text.slice(0, 120)}`
      );
      error.status = response.status;
      // Rights are checked per request, so a 403 here means they changed under
      // the open page rather than that the caller did something wrong.
      if (response.status === 403) recoverFromAccessLoss();
      throw error;
    }

    return response.json();
  }

  /**
   * Re-reads the granted points after a 403.
   *
   * That is the whole recovery: the list either still holds a point the
   * operator may use, and the page moves to it, or it comes back empty and the
   * page falls through to the "no points assigned" screen it already renders.
   * Guarded by a ref so a burst of failed requests recovers once, and so the
   * point request made by the recovery cannot start another one.
   */
  async function recoverFromAccessLoss() {
    if (accessRecoveryRef.current) return;
    accessRecoveryRef.current = true;
    const lostPlaceId = selectedPlaceId;
    try {
      const loaded = await loadStockPlaces();
      if (!loaded.length) {
        notifyError(t('Your Stock Manager access was revoked. Contact an administrator.'));
      } else if (lostPlaceId && !loaded.some(place => place.id === lostPlaceId)) {
        notifyError(t('Access to this cooking point was revoked. Switched to another point.'));
      }
    } finally {
      accessRecoveryRef.current = false;
    }
  }

  function notifyError(message) {
    if (window.sonner?.toast?.error) window.sonner.toast.error(message);
    else console.error(message);
  }

  /**
   * Seeds the editable state from `localBalance`, never from the effective one.
   *
   * The control edits the operator value, so seeding it from the computed
   * effective balance would make every reload silently revert the edit.
   */
  function applyStockPayload(json) {
    const items = json.results || [];
    if (json.mode) setBalanceMode(json.mode);
    setLocalBalances(prev => {
      const next = { ...prev };
      items.forEach(item => { next[item.id] = item.localBalance ?? null; });
      return next;
    });
    return items;
  }

  /**
   * Single writer for the address: the tab in the hash, the browsed group in
   * `?group`.
   *
   * `group` is kept only for Explore. Out of stock always lists the whole
   * point, so carrying the parameter over would read as a group-scoped list.
   * The group itself is not lost — it stays in state and comes back with the
   * tab.
   */
  function writeUrl(groupSlug, tabId, { replace = false } = {}) {
    const url = new URL(window.location);
    if (groupSlug && tabId === TAB_EXPLORE) {
      url.searchParams.set('group', groupSlug);
    } else {
      url.searchParams.delete('group');
    }
    url.hash = tabId;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  // Update URL with current group slug
  function updateUrl(groupSlug) {
    writeUrl(groupSlug, activeTab);
  }

  // Switching tabs is not navigation inside the catalog, so it replaces the
  // entry instead of stacking one up per click.
  function handleTabChange(tabId) {
    setActiveTab(tabId);
    writeUrl(currentGroup?.slug ?? null, tabId, { replace: true });
  }

  // Load group by slug with recursive search and build navigation stack
  async function loadGroupBySlug(slug) {
    if (!slug || !selectedPlaceId) return null;

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

        // Same place scope as loadGroups: /core/groups is gated by
        // requireStockPlaceAccess and answers 403 without a placeId.
        const params = new URLSearchParams({ placeId: selectedPlaceId });
        if (parentId) params.set('parent', parentId);
        const endpoint = `${base}/core/groups?${params}`;
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

  /** Returns the granted points so callers can tell an empty list from a failure. */
  async function loadStockPlaces() {
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const json = await fetchJsonNoCache(`${base}/core/stock-places`);
      const loadedPlaces = json.results || [];
      setPlaces(loadedPlaces);
      const savedPlaceId = localStorage.getItem('stockManagerPlaceId');
      const initialPlace = loadedPlaces.find(place => place.id === savedPlaceId) || loadedPlaces[0];
      // Persisted as well, so a point that is no longer granted does not come
      // back as the preferred one on the next visit.
      localStorage.setItem('stockManagerPlaceId', initialPlace ? initialPlace.id : '');
      setSelectedPlaceId(initialPlace ? initialPlace.id : null);
      return loadedPlaces;
    } catch (err) {
      console.error('load stock places error', err);
      setPlaces([]);
      setSelectedPlaceId(null);
      return [];
    }
  }

  // Initial load only gets contextual places. Product data starts after a point is selected.
  useEffect(() => {
    loadStockPlaces();
  }, []);

  useEffect(() => {
    if (!selectedPlaceId) {
      setInitialItems([]);
      setGroups([]);
      setDishes([]);
      setResults([]);
      return undefined;
    }

    async function initializeFromUrl() {
      loadInitialItems();

      // Root means no group is open, so no dishes are listed. Leaving them
      // behind is how the previous kitchen's dishes used to survive a switch.
      async function showRoot() {
        setCurrentGroup(null);
        setGroupStack([]);
        setDishes([]);
        await loadGroups(null);
      }

      const groupSlug = getGroupSlugFromUrl();
      let resolvedSlug = null;
      if (groupSlug) {
        const result = await loadGroupBySlug(groupSlug);
        if (result) {
          resolvedSlug = result.group.slug;
          setCurrentGroup(result.group);
          setGroupStack(result.stack);
          await loadGroups(result.group.id);
          await loadDishes(result.group.id);
        } else {
          // Group not found, load root
          await showRoot();
        }
      } else {
        await showRoot();
      }

      // Clears a stale `?group` left by a link that opened on another tab or
      // that names a group which no longer resolves. The hash is read again
      // rather than taken from state: it is the truth this effect started from.
      writeUrl(resolvedSlug, readTabFromUrl(), { replace: true });

      setIsInitialLoad(false);
    }

    initializeFromUrl();

    const interval = setInterval(() => {
      loadInitialItems();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedPlaceId]);

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!selectedPlaceId) return undefined;
    async function handlePopState() {
      setActiveTab(readTabFromUrl());
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
  }, [selectedPlaceId]);

  // Debounced search effect
  useEffect(() => {
    if (!selectedPlaceId) {
      setResults([]);
      return undefined;
    }
    const term = (q || '').trim();
    if (!term) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(term);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [q, selectedPlaceId]);

  async function loadInitialItems() {
    if (!selectedPlaceId) return;
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/stock-items?placeId=${encodeURIComponent(selectedPlaceId)}`;
      const json = await fetchJsonNoCache(endpoint);
      setInitialItems(applyStockPayload(json));
    } catch (err) {
      console.error('load initial items error', err);
    }
  }

  async function loadGroups(parentId) {
    if (!selectedPlaceId) return;
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const params = new URLSearchParams({ placeId: selectedPlaceId });
      if (parentId) params.set('parent', parentId);
      const endpoint = `${base}/core/groups?${params}`;
      const json = await fetchJsonNoCache(endpoint);
      setGroups(json.results || []);
    } catch (err) {
      console.error('load groups error', err);
    }
  }

  async function loadDishes(groupId) {
    if (!groupId || !selectedPlaceId) {
      setDishes([]);
      return;
    }
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/dishes-by-group?group=${encodeURIComponent(groupId)}&placeId=${encodeURIComponent(selectedPlaceId)}`;
      const json = await fetchJsonNoCache(endpoint);
      setDishes(applyStockPayload(json));
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
    if (!term || !selectedPlaceId) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
      const endpoint = `${base}/core/api?q=${encodeURIComponent(term)}&placeId=${encodeURIComponent(selectedPlaceId)}`;
      const json = await fetchJsonNoCache(endpoint);
      setResults(applyStockPayload(json));
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

  function handleLocalBalanceChange(id, newBalance) {
    setLocalBalances(prev => ({ ...prev, [id]: newBalance }));
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

  function readCsrfToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') return decodeURIComponent(value);
    }
    return null;
  }

  async function postStockChange(path, body) {
    const base = (window.location.pathname || '').replace(/\/[^/]*$/, '');
    return fetchJsonNoCache(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xsrf-token': readCsrfToken()
      },
      credentials: 'include',
      body: JSON.stringify({ ...body, placeId: selectedPlaceId })
    });
  }

  /** Reloads every list so effective values and the Out of stock tab stay in sync. */
  async function reloadStockViews() {
    await loadInitialItems();
    if (currentGroup) await loadDishes(currentGroup.id);
    if ((q || '').trim()) await performSearch((q || '').trim());
  }

  async function updateStock(id, balance) {
    if (!selectedPlaceId) return;
    try {
      const json = await postStockChange('/core/update-stock', { id, balance });
      if (json.success) {
        setLocalBalances(prev => ({ ...prev, [id]: json.dishPlace?.localBalance ?? balance }));
        await reloadStockViews();
      } else {
        notifyError(t('Update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('update error', err);
      notifyError(t('Update error'));
    }
  }

  /** Point-local switch; the catalog-wide `Dish.enable` is not touched here. */
  async function toggleDishPlaceEnable(id, enable) {
    if (!selectedPlaceId) return;
    try {
      const json = await postStockChange('/core/update-dish-place-enable', { id, enable });
      if (json.success) {
        await reloadStockViews();
      } else {
        notifyError(t('Update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('toggle product place enable error', err);
      notifyError(t('Update error'));
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
        notifyError(t('Visibility update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('update visible error', err);
      notifyError(t('Visibility update error'));
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
        notifyError(t('Visibility update failed: {error}', { error: json.error || t('Unknown error') }));
      }
    } catch (err) {
      console.error('update enable error', err);
      notifyError(t('Visibility update error'));
    }
  }

  async function handleBulkEnable(dishIds, enabled) {
    try {
      const promises = dishIds.map(id => updateEnable(id, 'dish', enabled));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk enable error', err);
      notifyError(t('Bulk visibility update error'));
    }
  }

  async function handleBulkVisibility(dishIds, visible) {
    try {
      const promises = dishIds.map(id => updateVisible(id, 'dish', visible));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk visibility error', err);
      notifyError(t('Bulk visibility update error'));
    }
  }

  async function handleBulkBalance(dishIds, balance) {
    try {
      // Update all dishes in parallel
      const promises = dishIds.map(id => updateStock(id, balance));
      await Promise.all(promises);
    } catch (err) {
      console.error('bulk balance error', err);
      notifyError(t('Bulk balance update error'));
    }
  }

  const isSearching = (q || '').trim().length > 0;

  function handlePlaceChange(placeId) {
    localStorage.setItem('stockManagerPlaceId', placeId || '');
    setCurrentGroup(null);
    setGroupStack([]);
    setDishes([]);
    updateUrl(null);
    // Stock is per point, so values from the previous kitchen must not linger.
    setLocalBalances({});
    setSelectedPlaceId(placeId);
  }

  const tabs = [
    {
      id: TAB_OUT_OF_STOCK,
      label: t('Out of stock'),
      content: (
        <LimitedStockSection
          items={initialItems}
          mode={balanceMode}
          localBalances={localBalances}
          onUpdateStock={updateStock}
          onLocalBalanceChange={handleLocalBalanceChange}
          onToggleEnable={toggleDishPlaceEnable}
          canManage={canManage}
        />
      )
    },
    {
      id: TAB_EXPLORE,
      label: t('Explore'),
      content: (
        <div>
          <SearchBar query={q} onQueryChange={setQ} onClear={clearSearch} />

          {isSearching ? (
            <DishesGrid
              dishes={results}
              mode={balanceMode}
              localBalances={localBalances}
              onUpdateStock={updateStock}
              onLocalBalanceChange={handleLocalBalanceChange}
              onToggleEnable={toggleDishPlaceEnable}
              title={results.length === 0 ? t('No results') : t('Search Results')}
              canManage={canManage}
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
              />

              <DishesGrid
                dishes={dishes}
                mode={balanceMode}
                localBalances={localBalances}
                onUpdateStock={updateStock}
                onLocalBalanceChange={handleLocalBalanceChange}
                onToggleEnable={toggleDishPlaceEnable}
                onBulkEnable={handleBulkEnable}
                onBulkVisibility={handleBulkVisibility}
                onBulkBalance={handleBulkBalance}
                showToolbox={true}
                canManage={canManage}
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
        <div className="flex items-center gap-3">
          {places.length > 0 && (
            <Select value={selectedPlaceId || undefined} onValueChange={handlePlaceChange}>
              <SelectTrigger className="h-10 min-w-56" aria-label={t('Cooking point')}>
                <SelectValue placeholder={t('Select cooking point')} />
              </SelectTrigger>
              <SelectContent>
                {places.map(place => (
                  <SelectItem key={place.id} value={place.id}>{place.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing || !selectedPlaceId}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            {isRefreshing ? t('Refreshing...') : t('Refresh now')}
          </button>
        </div>
      </div>
      {!selectedPlaceId ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          {t('No cooking points are assigned to your Stock Manager access. Contact an administrator.')}
        </div>
      ) : <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  );
}

// Main component wrapped with I18nProvider
export default function StockManager(props) {
  return (
    <I18nProvider initialLocale={props.locale} messages={props.messages}>
      <StockManagerContent canManage={props.canManage} />
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
