# Promotion codes

### How it works
Promotions code is model `PromotionCode` Which contains settings for promotional codes. Next, if you know the promotional code, you can add it to the Order using the `Order.applyPromotionCode` method. The promotional code itself does nothing until we attach `Promotion` to it. After we have attached an action, the promotional code will call it every time it is valid.