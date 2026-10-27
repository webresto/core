# Promotion codes

### How it works
Promotions code is model `PromotionCode` Which contains settings for promotional codes. Next, if you know the promotional code, you can add it to the Order using the `Order.applyPromotionCode` method. The promotional code itself does nothing until we attach `Promotion` to it. After we have attached an action, the promotional code will call it every time it is valid.

An order holds one code; applying another replaces it. The code's promotions apply whether they are switched on or off (`enable` only says whether a promotion applies by itself) and go first: an exclusive one (`isJoint: false`) takes the basket alone, joint ones go with the joint automatic promotions, and an exclusive automatic promotion gives way to them. Below its `minBasketTotal` a code's promotion gives nothing and puts nothing aside.
