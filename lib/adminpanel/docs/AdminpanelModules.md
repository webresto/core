# Adminpanel Modules — Authoring Guide

Модули adminpanel — это React-компоненты, которые собираются через Vite и загружаются adminizer динамически.

---

## Структура файла

```
src/
  settings-manager.jsx   ← пример эталонного модуля
  order-kanban.jsx
  notifications-manager.jsx
  orders-report.jsx
```

Каждый модуль — один `.jsx` файл. Точка входа экспортирует компонент по умолчанию, обёрнутый в `I18nProvider`.

```jsx
export default function MyModule({ props }) {
  return (
    <I18nProvider initialLocale={props?.locale || 'en'} messages={props?.messages}>
      <MyModuleContent />
    </I18nProvider>
  );
}
```

---

## Runtime зависимости

Модули **не импортируют** React, UI-компоненты или иконки через npm. Всё доступно через глобальные переменные:

```js
// React
const React = window.React;
const { useState, useEffect, useRef, useMemo } = window.React;

// UI-компоненты (shadcn/ui)
const {
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose, Sheet, SheetContent, SheetHeader,
  SheetTitle, Input, Textarea, Label, Separator, Checkbox, Skeleton,
} = window.UIComponents;

// JS-компоненты
const { MonacoEditor, MultiSelect } = window.JSComponents;

// Иконки Lucide
const { Save, Download, Upload, Settings, ChevronDown } = window.LucideReact;

// HTTP-клиент
const axios = window.axios;

// Тосты
window.sonner.toast('Saved');
window.sonner.toast.error('Failed');
```

Полный список доступных компонентов — в `adminizer/docs/UIComponents.md`.

---

## Тема (светлая / тёмная)

Adminizer управляет темой через:
- `localStorage.getItem('appearance')` → `'light' | 'dark' | 'system'`
- Класс `dark` на `document.documentElement`
- CSS-переменные (см. ниже)

### Обязательный хук

Добавь в главный компонент — он форсирует ре-рендер при смене темы:

```jsx
const APPEARANCE_STORAGE_KEY = 'appearance';

function getPreferredAppearance() {
  return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system';
}

function isDarkAppearance(appearance) {
  if (appearance === 'dark') return true;
  if (appearance === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function useAppearance() {
  const [appearance, setAppearance] = useState(getPreferredAppearance);
  useEffect(() => {
    const sync = () => setAppearance(getPreferredAppearance());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
    sync();
    window.addEventListener('appearanceChanged', sync); // текущая вкладка
    window.addEventListener('storage', sync);           // другие вкладки
    media?.addEventListener('change', sync);            // системная тема
    return () => {
      window.removeEventListener('appearanceChanged', sync);
      window.removeEventListener('storage', sync);
      media?.removeEventListener('change', sync);
    };
  }, []);
  return useMemo(() => isDarkAppearance(appearance), [appearance]);
}

function MyContent() {
  useAppearance(); // ← просто вызвать, возвращаемое значение не нужно
  // ...
}
```

### CSS-переменные для стилей

Для своих div/span используй CSS-переменные вместо хардкода цветов:

| Переменная               | Назначение                        |
|--------------------------|-----------------------------------|
| `var(--background)`      | Фон страницы                      |
| `var(--foreground)`      | Основной текст                    |
| `var(--muted)`           | Приглушённый фон (панели, sidebar)|
| `var(--muted-foreground)`| Приглушённый текст                |
| `var(--border)`          | Цвет рамок                        |
| `var(--accent)`          | Выделение при hover/active        |
| `var(--primary)`         | Основной цвет бренда              |
| `var(--destructive)`     | Красный (ошибки, delete)          |
| `var(--card)`            | Фон карточек                      |

**Пример:**
```jsx
// ✅ правильно — реагирует на смену темы автоматически
<div style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
  <div style={{ borderBottom: '1px solid var(--border)' }}>...</div>
</div>

// ❌ неправильно — не реагирует на тёмную тему
<div style={{ background: '#ffffff', color: '#0f172a' }}>
```

### Корневой контейнер

Все модули рендерятся в `<div class="m-5">` без фона. Обязательно задавай фон на корневом элементе:

```jsx
<div
  className="absolute inset-0 flex overflow-hidden"
  style={{ background: 'var(--background)', color: 'var(--foreground)' }}
>
```

---

## Tailwind-классы

Adminizer генерирует Tailwind CSS — **стандартные** классы доступны. Произвольные значения (`text-[10px]`, `h-[75vh]`, `px-1.5`) **не генерируются** и не работают.

**Что работает:** `flex`, `flex-col`, `flex-1`, `flex-wrap`, `gap-1..4`, `p-0..6`, `px-1..6`, `py-1..4`, `mt-1..4`, `mb-1..4`, `text-xs`, `text-sm`, `text-base`, `font-mono`, `font-bold`, `font-semibold`, `overflow-y-auto`, `overflow-hidden`, `rounded-md`, `border`, `w-full`, `w-72`, `w-80`, `h-4`, `h-10`, `opacity-70`, `hidden`, `block`, `sr-only`, `truncate`, `break-all`, `transition-colors`, `cursor-pointer`, `items-center`, `items-start`, `justify-between`, `justify-center`, `bg-muted`, `bg-accent`, `hover:bg-accent`, `text-muted-foreground`, `text-destructive`, `border-b`, `border-r`.

**Заменяй произвольные значения на `style={}`:**
```jsx
// ❌ не работает
<Badge className="text-[10px] px-1.5">

// ✅ работает
<Badge style={{ fontSize: 10, padding: '1px 5px' }}>
```

---

## UIComponents — основные паттерны

### Button

```jsx
<Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
  <Save className="w-4 h-4 mr-1" />
  {saving ? 'Saving...' : 'Save'}
</Button>
<Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
<Button variant="ghost" size="icon"><MoreHorizontal /></Button>
```

### Badge

```jsx
// Стандартные размеры для бейджей в списках:
<Badge variant="default" style={{ fontSize: 10, padding: '1px 5px' }}>Type json</Badge>
<Badge variant="secondary" style={{ fontSize: 10, padding: '1px 5px' }}>module</Badge>
<Badge variant="destructive" style={{ fontSize: 10, padding: '1px 5px' }}>Read only</Badge>
<Badge variant="outline" style={{ fontSize: 10, padding: '1px 5px' }}>Required</Badge>
```

### Dialog

```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button variant="default" onClick={handleApply}>Apply</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sheet (мобильное меню/панель)

```jsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="top" className="flex flex-col p-0" style={{ height: '75vh' }}>
    <SheetHeader className="p-3 border-b flex-shrink-0">
      <SheetTitle className="sr-only">Title</SheetTitle>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto">{/* list */}</div>
  </SheetContent>
</Sheet>
```

### Input / Textarea

```jsx
<Input type="search" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
<Textarea rows={4} value={val} onChange={e => setVal(e.target.value)} />
```

---

## Активные элементы списка

Паттерн выделения активного/выбранного элемента через inline-стиль:

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
```

---

## Тосты вместо alert()

```jsx
// ❌
alert('Error: ' + e.message);

// ✅
window.sonner?.toast.error(e.message);
window.sonner?.toast('Saved successfully');
window.sonner?.toast.promise(apiCall(), { loading: '...', success: 'Done', error: 'Failed' });
```

---

## API-запросы

Используй `window.axios` для запросов к серверу:

```js
async function apiRequest(path, options = {}) {
  const response = await window.axios({
    url: `${getBaseAdminPath()}${path}`,
    method: options.method || 'GET',
    data: options.body,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  return response.data;
}
```

---

## Сборка и деплой

```bash
# Сборка
cd local_modules/core
npm run build:adminizer

# Деплой (копирование в node_modules, т.к. не симлинк)
cp assets/core-adminizer-assets/SettingsManager.js \
   ../../node_modules/@webresto/core/assets/core-adminizer-assets/SettingsManager.js
```

Замени `SettingsManager` на нужный модуль. Список модулей в `vite.config.js`:
- `SettingsManager`
- `OrderKanban`
- `NotificationsManager`
- `OrdersReport`
- `StockManager`
- `OrderLogsViewer`
