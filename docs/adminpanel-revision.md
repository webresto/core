# Admin Panel — Section Overview

## Sections

### Current Orders (Kanban)
**Path:** `/admin/order-kanban`
**Access:** `order-kanban`
View live orders grouped by status. Drag orders between states. Real-time updates via SSE stream.

---

### Product Catalog
**Path:** `/admin/catalog/products`
**Access:** `catalog-products`
Browse and inline-edit products grouped by category. Upload and manage product media.

---

### Stock Manager
**Path:** `/admin/stock-manager`
**Access:** `stock-manager`
View all dishes with stock levels. Update quantities, toggle visibility, and soft-delete items.

---

### Notifications Manager
**Path:** `/admin/notifications-manager`
**Access:** `notifications-manager`
List sent notifications, view delivery details, retry failed deliveries, create manual notifications, manage notification types.

---

### Notification Channels
**Path:** `/admin/notification-channels`
**Access:** `notifications-manager`
View configured delivery channels (push, email, etc.) and update their settings.

---

### Settings Manager
**Path:** `/admin/settings-manager`
**Access:** all authenticated admins
View and update application settings by key. Export settings to JSON or import from JSON file.

---

### Orders Report
**Path:** `/admin/orders-report`
**Access:** `orders-report`
Aggregated order statistics. Filter by date range and view totals by period.

---

### FCM Settings — Mobile
**Path:** `/admin/firebase-notifications/mobile`
**Access:** all authenticated admins
Configure Firebase Cloud Messaging credentials for mobile push notifications.

---

### FCM Settings — Web
**Path:** `/admin/firebase-notifications/web`
**Access:** all authenticated admins
Configure Firebase Cloud Messaging credentials for web push notifications.
