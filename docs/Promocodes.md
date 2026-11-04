# Promotion codes

### How it works
Promotions code is model `PromotionCode` Which contains settings for promotional codes. Next, if you know the promotional code, you can add it to the Order using the `Order.applyPromotionCode` method. The promotional code itself does nothing until we attach `Promotion` to it. After we have attached an action, the promotional code will call it every time it is valid.

An order holds one code; applying another replaces it. The code's promotions go first: an exclusive one (`isJoint: false`) takes the basket alone, joint ones go with the joint automatic promotions, and an exclusive automatic promotion gives way to them. Below its `minBasketTotal` a code's promotion gives nothing and puts nothing aside.

A promotion has two switches. `enable` is "works at all": switched off, it applies nowhere — a code does not bring it back, and a code of nothing but switched-off promotions is refused by `Order.applyPromotionCode` (the order keeps the string typed, without the code). `onlyByCode` is "does not apply by itself": such a promotion applies through its codes and is not shown on the storefront. A promotion meant for a code alone is `{ enable: true, onlyByCode: true }` — until C22 of `marketing.plan.md` that was expressed by switching it off, and the migration moved those records.

A code's promotion that gives nothing now writes the reason into `order.promotionState`, each entry `byCode: true`: out of the promotion's hours, not for the way the order is received, below the minimum basket, or switched off (`promocode-promotion-disabled`).
