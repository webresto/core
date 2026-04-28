# Adminpanel Modules — Authoring Guide

Each module is a React component built with Vite and loaded dynamically by adminizer at runtime.

---

## Quick-start: creating a new module

### 1. Add the entry point to `vite.config.js`

```js
// local_modules/core/lib/adminpanel/vite.config.js
entry: {
  MyModule: path.resolve(__dirname, 'src/my-module.jsx'),
  // ...existing entries
}
```

### 2. Create `src/my-module.jsx`

Use this minimal template:

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

// ── theme sync ────────────────────────────────────────────────────────────────
const APPEARANCE_STORAGE_KEY = 'appearance';
function getPreferredAppearance() { return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system'; }
function isDarkAppearance(a) {
  if (a === 'dark') return true;
  if (a === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
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
  return useMemo(() => isDarkAppearance(appearance), [appearance]);
}

// ── UI globals ────────────────────────────────────────────────────────────────
const { Button, Badge, Input } = window.UIComponents;
const { Save } = window.LucideReact;

// ── main content ──────────────────────────────────────────────────────────────
function MyModuleContent() {
  const { t } = useTranslation();
  useAppearance(); // required — triggers re-render on theme change

  return (
    <div
      className="absolute inset-0 flex overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <p>{t('Hello')}</p>
    </div>
  );
}

// ── export ────────────────────────────────────────────────────────────────────
export default function MyModule({ props }) {
  return (
    <I18nProvider initialLocale={props?.locale || 'en'} messages={props?.messages}>
      <MyModuleContent />
    </I18nProvider>
  );
}
```

### 3. Register the route in adminizer

Add a controller entry (see existing controllers in `src/controller/`) pointing to:
```
moduleComponent: `/restocore/assets/core-adminizer-assets/MyModule.js`
```

### 4. Build and deploy

```bash
cd local_modules/core
npm run build:adminizer

# Deploy — node_modules/@webresto/core is a copy, not a symlink
cp assets/core-adminizer-assets/MyModule.js \
   ../../node_modules/@webresto/core/assets/core-adminizer-assets/MyModule.js
```

> **Why the copy step?** `@webresto/core` is installed as a `file:` dependency but npm copies it instead of symlinking. The server serves assets from `node_modules/@webresto/core/assets/`, not `local_modules/core/assets/`. Always copy after build.

---

## File structure

```
local_modules/core/lib/adminpanel/
  src/
    settings-manager.jsx      ← reference implementation (sidebar + editor pattern)
    order-kanban.jsx
    notifications-manager.jsx
    orders-report.jsx
    stock-manager.jsx
    components/               ← shared sub-components (stock-manager only)
  i18n/                       ← I18nProvider + useTranslation
  docs/
    AdminpanelModules.md      ← this file
  vite.config.js
```

---

## Runtime dependencies

Modules do **not** import React, UI components, or icons via npm. Everything is available as globals injected by adminizer:

```js
// React 19
const { useState, useEffect, useRef, useMemo, useCallback } = window.React;

// shadcn/ui components
const {
  Button, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
  DialogStack, DialogStackTrigger, DialogStackOverlay, DialogStackBody,
  DialogStackContent, DialogStackHeader, DialogStackTitle, DialogStackFooter,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
  Input, Textarea, Label, Separator, Checkbox, Skeleton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Popover, PopoverTrigger, PopoverContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} = window.UIComponents;

// Rich JS components
const { MonacoEditor, MultiSelect, VanillaJSONEditor } = window.JSComponents;

// All Lucide icons
const { Save, Download, Upload, Settings, ChevronDown, X, Plus } = window.LucideReact;

// HTTP client (axios)
const axios = window.axios;

// Toast notifications
window.sonner?.toast('Saved');
window.sonner?.toast.error('Something went wrong');
window.sonner?.toast.promise(apiCall(), { loading: '...', success: 'Done', error: 'Failed' });
```

Full component reference: `adminizer/docs/UIComponents.md`.

---

## Theme (light / dark)

Adminizer controls the theme via:
- `localStorage.getItem('appearance')` → `'light' | 'dark' | 'system'`
- The `dark` class on `document.documentElement`
- CSS custom properties on `:root` and `.dark`

Three events fire when the theme changes:
| Event | Trigger |
|---|---|
| `appearanceChanged` | User switches theme in the current tab |
| `storage` | Theme changed in another tab |
| `change` (MediaQueryList) | OS-level system theme change |

### Required: `useAppearance` hook

Call it in your root content component. It subscribes to all three events and forces a re-render, making Tailwind `dark:` classes and `var(--...)` values pick up the new theme:

```js
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
  return useMemo(() => isDarkAppearance(appearance), [appearance]);
}

function MyContent() {
  useAppearance(); // call it, ignore the return value
}
```

### CSS custom properties

Use these for all colors on your own `div`/`span` elements:

| Property | Use for |
|---|---|
| `var(--background)` | Page / root background |
| `var(--foreground)` | Primary text |
| `var(--muted)` | Subdued backgrounds (panels, sidebars, list headers) |
| `var(--muted-foreground)` | Secondary / hint text |
| `var(--border)` | Borders and dividers |
| `var(--accent)` | Hover and active backgrounds |
| `var(--accent-foreground)` | Text on accent background |
| `var(--primary)` | Brand color (active indicator, links) |
| `var(--primary-foreground)` | Text on primary background |
| `var(--destructive)` | Errors, delete actions |
| `var(--card)` | Card / panel background |

```jsx
// ✅ reacts to theme changes automatically
<div style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
  <div style={{ borderBottom: '1px solid var(--border)' }} />
</div>

// ❌ breaks in dark mode
<div style={{ background: '#ffffff', color: '#0f172a' }}>
```

### Root container

Modules render inside `<div class="m-5">` which has no background. Always set the background on your root element:

```jsx
<div
  className="absolute inset-0 flex overflow-hidden"
  style={{ background: 'var(--background)', color: 'var(--foreground)' }}
>
```

---

## Tailwind classes

Adminizer compiles its own Tailwind CSS. **Standard utility classes are available**. Arbitrary values (`text-[10px]`, `h-[75vh]`, `px-1.5`) are **not generated** and will silently have no effect.

**Available (non-exhaustive):** `flex flex-col flex-1 flex-wrap flex-shrink-0`, `gap-1 gap-2 gap-3 gap-4`, `p-0..6 px-1..6 py-1..4 mt-1..4 mb-1..4`, `text-xs text-sm text-base text-lg text-xl`, `font-mono font-bold font-semibold`, `overflow-y-auto overflow-hidden overflow-x-auto`, `rounded-md rounded-full`, `border border-b border-r border-t`, `w-full w-72 w-80 h-4 h-10`, `opacity-70 hidden block sr-only truncate break-all`, `transition-colors cursor-pointer`, `items-center items-start justify-between justify-center`, `bg-muted bg-accent hover:bg-accent`, `text-muted-foreground text-destructive text-primary`, `absolute inset-0 relative fixed`, `min-w-0 min-h-0`, `select-none`.

**Replace arbitrary values with `style={}`:**
```jsx
// ❌ won't work
<Badge className="text-[10px] px-1.5 h-[20px]">

// ✅ works
<Badge style={{ fontSize: 10, padding: '1px 5px', height: 20 }}>
```

**Also avoid hardcoded color classes** — they ignore the theme:
```jsx
// ❌ won't adapt to dark mode
<span className="text-red-500 bg-green-100">

// ✅ use semantic CSS variables
<span style={{ color: 'var(--destructive)' }}>
<span style={{ background: 'var(--accent)' }}>

// ✅ exception: status colors that are intentionally fixed
<span style={{ color: '#16a34a' }}>∞ Unlimited</span>  // green = "in stock"
<span style={{ color: STATE_COLORS[order.state] }}>    // per-state color map
```

---

## Component patterns

### Button

```jsx
<Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
  <Save className="w-4 h-4 mr-1" />
  {saving ? 'Saving...' : 'Save'}
</Button>
<Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
<Button variant="ghost" size="icon"><X /></Button>
<Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
```

### Badge (in list items)

Badges in list rows should be visually small. Since `text-[10px]` is not generated, use inline style:

```jsx
<Badge variant="default"     style={{ fontSize: 10, padding: '1px 5px' }}>json</Badge>
<Badge variant="secondary"   style={{ fontSize: 10, padding: '1px 5px' }}>module</Badge>
<Badge variant="destructive" style={{ fontSize: 10, padding: '1px 5px' }}>read-only</Badge>
<Badge variant="outline"     style={{ fontSize: 10, padding: '1px 5px' }}>required</Badge>
```

### Dialog (modal)

```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="flex flex-col" style={{ maxWidth: 700, maxHeight: '85vh' }}>
    <DialogHeader>
      <DialogTitle>Confirm action</DialogTitle>
    </DialogHeader>
    <div className="flex-1 overflow-y-auto px-1">{/* scrollable content */}</div>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button variant="default" onClick={handleApply}>Apply</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### DialogStack (side panel / wizard)

Use `DialogStack` instead of a custom slide-over panel. Panels slide in from the right; previous panels are dimmed behind.

```jsx
const { DialogStack, DialogStackTrigger, DialogStackOverlay, DialogStackBody,
        DialogStackContent, DialogStackHeader, DialogStackTitle,
        DialogStackFooter, DialogStackNext, DialogStackPrevious } = window.UIComponents;

<DialogStack>
  <DialogStackTrigger asChild>
    <Button variant="ghost" size="icon"><Info className="w-5 h-5" /></Button>
  </DialogStackTrigger>
  <DialogStackOverlay />
  <DialogStackBody>
    <DialogStackContent>
      <DialogStackHeader>
        <DialogStackTitle>Help</DialogStackTitle>
      </DialogStackHeader>
      <div className="flex-1 overflow-y-auto p-6">{/* content */}</div>
    </DialogStackContent>
  </DialogStackBody>
</DialogStack>
```

### Sheet (mobile slide-up)

```jsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="top" className="flex flex-col p-0" style={{ height: '75vh' }}>
    <SheetHeader className="p-3 border-b flex-shrink-0">
      <SheetTitle className="sr-only">Select item</SheetTitle>
      <Input type="search" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
    </SheetHeader>
    <div className="flex-1 overflow-y-auto">{/* list */}</div>
  </SheetContent>
</Sheet>
```

### Select

```jsx
<Select value={val} onValueChange={setVal}>
  <SelectTrigger size="sm" style={{ minWidth: 120 }}>
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>
```

### Input / Textarea

```jsx
<Input type="search" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
<Textarea rows={4} value={val} onChange={e => setVal(e.target.value)} />
```

### MonacoEditor (JSON / code)

```jsx
<MonacoEditor
  value={code}
  onChange={setCode}
  options={{ language: 'json' }}  // 'javascript', 'sql', etc.
  disabled={readOnly}
/>
```

---

## List item — active state pattern

The selected item in a list gets a left primary-color indicator and an accent background. Use inline styles because `border-l-2 border-l-primary` is not reliably generated:

```jsx
<button
  onClick={() => onSelect(item)}
  className="block w-full text-left transition-colors hover:bg-accent"
  style={{
    padding: '10px 12px',
    borderBottom: '1px solid color-mix(in srgb, var(--foreground) 15%, transparent)',
    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
    background: isActive ? 'var(--accent)' : 'transparent',
  }}
>
  <div className="font-mono text-xs font-semibold break-all">{item.key}</div>
  <div className="text-xs text-muted-foreground" style={{ marginTop: 2 }}>{item.name}</div>
  <div className="flex gap-1 flex-wrap" style={{ marginTop: 5 }}>
    <Badge variant="secondary" style={{ fontSize: 10, padding: '1px 5px' }}>{item.type}</Badge>
  </div>
</button>
```

---

## Two-column layout (sidebar + editor)

The standard layout used by `settings-manager`:

```jsx
<div
  className="absolute inset-0 flex overflow-hidden"
  style={{ background: 'var(--background)', color: 'var(--foreground)' }}
>
  {/* Left: list */}
  <div
    className="flex flex-col overflow-hidden border-r"
    style={{ width: 320, minWidth: 260, maxWidth: 420, background: 'var(--muted)' }}
  >
    <div className="flex-shrink-0 p-3 border-b">{/* header / search */}</div>
    <div className="flex-1 overflow-y-auto">{/* list items */}</div>
  </div>

  {/* Right: editor */}
  <div
    className="flex-1 overflow-hidden flex flex-col"
    style={{ background: 'var(--background)' }}
  >
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      {/* editor content */}
    </div>
  </div>
</div>
```

---

## Toasts instead of `alert()`

```jsx
// ❌ never use alert/confirm in modules
alert('Error: ' + e.message);

// ✅
window.sonner?.toast('Saved successfully');
window.sonner?.toast.error(e.message);
window.sonner?.toast.promise(
  apiCall(),
  { loading: 'Saving...', success: 'Saved', error: 'Failed' }
);
```

---

## API requests

```js
function getBaseAdminPath() {
  if (typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  return (window.location.pathname || '').replace(/\/[^/]*$/, '');
}

async function apiRequest(path, options = {}) {
  const response = await window.axios({
    url: `${getBaseAdminPath()}${path}`,
    method: options.method || 'GET',
    data: options.body,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  return response.data;
  // throws on non-2xx — catch at call site and show toast
}

async function apiGet(path) { return apiRequest(path); }
async function apiPost(path, body) { return apiRequest(path, { method: 'POST', body }); }
```

---

## Scrollbars

Thin styled scrollbars are applied automatically to all elements inside `.m-5` (the adminizer page wrapper) via global CSS in `adminizer/src/assets/css/app.css`. They adapt to the active theme via `var(--foreground)`:

- **Light mode** — light grey thumb on transparent track
- **Dark mode** — white-tinted thumb on transparent track (same CSS variable, different computed value)

You do not need to add any scrollbar styles manually. Just use `overflow-y-auto` on scrollable containers.

---

## Build and deploy

```bash
# 1. Build all modules
cd local_modules/core
npm run build:adminizer

# 2. Deploy one module
cp assets/core-adminizer-assets/MyModule.js \
   ../../node_modules/@webresto/core/assets/core-adminizer-assets/MyModule.js

# 2b. Deploy all at once
for f in SettingsManager OrderKanban NotificationsManager OrdersReport StockManager OrderLogsViewer; do
  cp assets/core-adminizer-assets/${f}.js \
     ../../node_modules/@webresto/core/assets/core-adminizer-assets/${f}.js
done

# 3. Rebuild adminizer CSS (only needed when app.css changes)
cd /prj/adminizer
npm run build:assets
```

### Module list (`vite.config.js` entries)

| Entry key | File | Route |
|---|---|---|
| `SettingsManager` | `src/settings-manager.jsx` | `/admin/settings-manager` |
| `OrderKanban` | `src/order-kanban.jsx` | `/admin/order-kanban` |
| `NotificationsManager` | `src/notifications-manager.jsx` | `/admin/notifications-manager` |
| `OrdersReport` | `src/orders-report.jsx` | `/admin/orders-report` |
| `StockManager` | `src/stock-manager.jsx` | `/admin/stock-manager` |
| `OrderLogsViewer` | `src/controls/order-logs-viewer.jsx` | *(control, not a page)* |

---

## Checklist for new modules

- [ ] `useAppearance()` called in root content component
- [ ] Root `div` has `style={{ background: 'var(--background)', color: 'var(--foreground)' }}`
- [ ] No hardcoded hex colors on background/text/border — use `var(--...)` instead
- [ ] No arbitrary Tailwind values (`text-[10px]`, `h-[75vh]`) — use `style={}` instead
- [ ] No `alert()` / `confirm()` — use `window.sonner?.toast`
- [ ] No npm imports for React, UI components, or icons — use `window.*` globals
- [ ] Entry added to `vite.config.js`
- [ ] After build: copied to `node_modules/@webresto/core/assets/core-adminizer-assets/`
