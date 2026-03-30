## 📦 Item Management: Visibility, Availability, and System Status

In the core system, items (Dishes and Groups) are managed through four primary fields that control their lifecycle, visibility in the catalog, and availability for ordering. Understanding the distinction between these fields is crucial for both manual administration and automated synchronization.

### 1. `isDeleted` (Soft Deletion)
The `isDeleted` field is a boolean flag used for soft deletion. 
*   **Purpose:** To mark an item as no longer existing in the system without permanently removing its record from the database. This preserves historical data (like past orders).
*   **Source:** Typically managed by **RMS Synchronization**. If an item is present in the database but missing from the nomenclature tree provided by the external RMS (e.g., iiko, Syrve), it is marked as `isDeleted: true`.
*   **Effect:** Items with `isDeleted: true` are excluded from all standard retrieval methods and menu builders.

---

### 2. `enable` (System Level Status)
The `enable` field is a system-level toggle that determines if an item is active within the ordering workflow.
*   **Purpose:** It acts as a **Manual Override** for administrators. It allows a manager to completely "kill" an item in the ordering system regardless of its status in the external RMS.
*   **Source:** Intended for **Manual Management** via administrative interfaces. RMS Adapters **do not overwrite** this field during synchronization, ensuring that manual administrative decisions are preserved.
*   **Effect:** 
    *   It is a **Hard Filter** at the database level. Queries for active items (like `Dish.getDishes()`) always include `enable: true`.
    *   If `enable: false`, the item is completely hidden from the menu and catalog, effectively disabling it for the order process.

---

### 3. `visible` (Catalog Visibility)
The `visible` field controls the item's presence in the public-facing menu or catalog.
*   **Purpose:** To decide if an item should be browsable by users in the menu. It is distinct from `enable` because an item might be technically "enabled" for orders (e.g., via a direct QR-link or as a hidden modifier) but not shown in the main catalog.
*   **Source:** Often managed **Automatically**. During RMS sync, new items are assigned a `visible` status based on the `VISIBLE_BY_DEFAULT_ON_SYNC` configuration setting.
*   **Effect:** 
    *   It is passed to the **Frontend**. The server no longer filters items by this field, allowing the client application to decide when and how to display invisible items.
    *   Unlike `enable`, a `visible: false` item is still technically order-able if its ID is known (e.g., via a QR-code or specialized marketing link).

---

### 4. `balance` (Stock Quantity)
The `balance` field represents the current physical availability of the item.
*   **Purpose:** To prevent users from ordering items that are out of stock.
*   **Values:**
    *   `-1`: Infinite stock (the item is always available).
    *   `0`: Out of stock. The item will be hidden from the menu unless the `SHOW_UNAVAILABLE_DISHES` setting is enabled (in which case it might be shown as "Sold Out").
    *   `> 0`: Limited quantity. The system tracks remaining stock during the order process.
*   **Source:** Managed by **Inventory Sync** from the external RMS.

---

### 🧠 Comparison Summary

| Field | Managed By | Level | Scenario |
| :--- | :--- | :--- | :--- |
| **`isDeleted`** | RMS Sync | Record | Item removed from the restaurant's POS system. |
| **`enable`** | Administrator | System | "We are stopping sales of this item on our website permanently." |
| **`visible`** | System/Logic | Catalog | "Hide this item from the main menu, but keep it available for special combos." |
| **`balance`** | Inventory Sync | Quantity | "We ran out of ingredients for this dish today." |

### 🛠️ Configuration and Management
*   **`VISIBLE_BY_DEFAULT_ON_SYNC`**: A global setting that determines whether new items imported from the RMS are immediately visible to customers.
*   **`SHOW_UNAVAILABLE_DISHES`**: Controls whether items with `balance: 0` remain visible in the catalog with a "Sold Out" state or are removed entirely.
