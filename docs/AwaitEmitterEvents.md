# AwaitEmitter Events

This document summarizes all events exposed by `AwaitEmitter`. Each event name corresponds to a specific hook in the core logic. Use `emitter.on(eventName, id, handler)` to subscribe to events. All parameters in the list below follow the typings from `libs/AwaitEmitter.ts`.

## Usage Example

```ts
import emitter from './AwaitEmitter';

emitter.on("core:order-after-create", "my-listener", async (order) => {
  // your code here
});
```

## Event Reference

| Event Name | Argument Types |
|------------|---------------|
| `rms-sync:before-each-group-item` | `[GroupRecord]` |
| `rms-sync:before-each-product-item` | `[DishRecord]` |
| `rms-sync:after-sync-products` | `[]` |
| `rms-sync:out-of-stocks-before-each-product-item` | `[Pick<DishRecord, "balance" | "rmsId">]` |
| `core:product-before-create` | `[DishRecord]` |
| `core:payment-document-check` | `[PaymentDocumentRecord]` |
| `core:payment-document-paid` | `[PaymentDocumentRecord]` |
| `core:payment-document-checked-document` | `[PaymentDocumentRecord]` |
| `core:order-after-order` | `[OrderRecord]` |
| `core:order-order-delivery` | `[OrderRecord]` |
| `core:order-before-order` | `[OrderRecord]` |
| `core:order-order` | `[OrderRecord]` |
| `core:order-order-self-service` | `[OrderRecord]` |
| `core:order-is-self-service` | `[OrderRecord, Customer, boolean, Address]` |
| `core:order-check` | `[OrderRecord, Customer, boolean, Address, string]` |
| `core:order-after-check-counting` | `[OrderRecord]` |
| `core:order-before-check` | `[OrderRecord, Customer, boolean, Address]` |
| `core:order-check-delivery` | `[OrderRecord]` |
| `settings:${string}` | `[SettingsRecord]` |
| `core:user-after-create` | `[UserRecord]` |
| `core:payment-document-before-create` | `[Payment]` |
| `core:order-after-dopaid` | `[OrderRecord]` |
| `core:order-after-count` | `[OrderRecord]` |
| `core:count-after-delivery-cost` | `[OrderRecord]` |
| `core:order-after-check-delivery` | `[OrderRecord]` |
| `core:count-before-delivery-cost` | `[OrderRecord]` |
| `core:order-after-promotion` | `[OrderRecord]` |
| `core:order-after-done` | `[OrderRecord, UserRecord, {isNewUser: boolean}]` |
| `core:count-before-promotion` | `[OrderRecord]` |
| `core:orderproduct-change-amount` | `[OrderDishRecord]` |
| `core:order-return-full-order-destroy-orderdish` | `[DishRecord, OrderRecord]` |
| `core:order-before-count` | `[OrderRecord]` |
| `core:order-payment` | `[OrderRecord, PaymentBack]` |
| `core:order-init-checkout` | `[OrderRecord, InitCheckout]` |
| `core:maintenance-enabled` | `[MaintenanceRecord]` |
| `core:maintenance-disabled` | `[]` |
| `core:group-get-menu` | `[GroupRecord[], string]` |
| `core:group-get-groups` | `[GetGroupType, { [groupId: string]: string }]` |
| `core:group-after-create` | `[GroupRecord]` |
| `core:group-before-update` | `[GroupRecord]` |
| `core:group-after-update` | `[GroupRecord]` |
| `core:group-before-create` | `[GroupRecord]` |
| `core:product-after-create` | `[DishRecord]` |
| `core:product-after-update` | `[DishRecord]` |
| `core:product-before-update` | `[DishRecord]` |
| `core:product-get-dishes` | `[DishRecord[]]` |
| `dialog-box:new` | `[DialogBox]` |
| `dialog-box:answer-received` | `[string, string]` |
| `core:add-product-before-write` | `[OrderRecord, DishRecord]` |
| `promotion-process:debug` | `[number, OrderRecord, PromotionRecord, any]` |
| `core:adapter-rms-sync-out-of-stock-touch` | `[]` |
| `core:order-after-create` | `[OrderRecord]` |
| `core:order-before-add-dish` | `[CriteriaQuery<OrderRecord>, DishRecord | string, number, OrderModifier[], string, "user" | "promotion" | "core" | "custom", boolean | undefined, number | undefined]` |
| `core:order-add-dish-reject-amount` | `[CriteriaQuery<OrderRecord>, DishRecord | string, number, OrderModifier[], string, "user" | "promotion" | "core" | "custom", boolean | undefined, number | undefined]` |
| `core:order-after-add-dish` | `[OrderDishRecord, CriteriaQuery<OrderRecord>, DishRecord | string, number, OrderModifier[], string, "user" | "promotion" | "core" | "custom", boolean | undefined, number | undefined]` |
| `core:order-before-remove-dish` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, number, boolean | undefined]` |
| `core:order-remove-dish-reject-no-orderdish` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, number, boolean | undefined]` |
| `core:order-before-set-count` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, number]` |
| `core:order-set-count-reject-amount` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, number]` |
| `core:order-after-set-count` | `[OrderRecord, CriteriaQuery<OrderRecord>, OrderDishRecord, number]` |
| `core:order-set-count-reject-no-orderdish` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, number]` |
| `core:order-before-set-comment` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, string]` |
| `core:order-after-set-comment` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, string]` |
| `core:order-set-comment-reject-no-orderdish` | `[CriteriaQuery<OrderRecord>, OrderDishRecord, string]` |
| `core:order-was-cleared` | `[CriteriaQuery<OrderRecord>]` |
| `core:order-set-tag` | `[CriteriaQuery<OrderRecord>, string]` |
| `core:order-set-custom-data` | `[CriteriaQuery<OrderRecord>, object]` |
| `core:order-after-remove-dish` | `[OrderRecord, string, DishRecord, number, boolean]` |
