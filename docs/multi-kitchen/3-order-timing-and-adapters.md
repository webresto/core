# The order, delivery time and adapters

## How a basket lives

When the customer adds a product, core first works out which kitchen to judge
it at, and checks three things: whether the dish can be cooked within the time
the customer named, whether the amount is there, and whether what the
installation needs to start an order is filled in — an address or a place, for
example. The last one is checked on every product, not once, so a basket
cannot be filled first and the address erased afterwards.

After any change the basket is recalculated. The recalculation assigns the
kitchen, spreads the lines across kitchens, trims what is short, and tells the
customer if something had to go. Then, for a delivery, it prices it by the
zone, and with no address it answers with soft calculation. Then it estimates
the time and adds up the total: the products, plus delivery, minus discounts.
The products total, everything about delivery, and the total are three numbers
with no copies. Everything about delivery — price, delivery product, message,
zone, time — sits in one delivery object on the order.

Only a basket is recalculated. A placed order no longer changes its kitchen,
price or contents.

At checkout core records the order type, checks that the RMS can handle
several kitchens if there is more than one, builds the address line and
decides whether a house number is needed. Then it checks that the timing is
consistent and that the chosen place serves this kind of order, cooks and is
open. The basket is recalculated one last time, and the chain names the kitchen
once more: if it names none, the order is not placed — except a delivery under
soft calculation, where an operator finds one. Then it checks that delivery is
possible — with soft calculation a refusal happens only on an installation with
no zones at all. Every refusal has its own code, so the storefront can show a
clear reason.

When the order is placed, the sold amount is taken off the operator's stock of
the kitchen that cooks each line, whether there is an RMS or not, and the
order goes to the RMS. When a delivery order is completed, its address is remembered for the
customer.

Everything that matters along the way — the kitchen assignment, removed items,
a route built or not, an exceeded wait, a closed place — is written to the
order log, which is visible in the admin panel.

## Delivery time

The promised time is made of three parts. Cooking — the longest time among the
basket's dishes; ready products and services are not cooked, and a dish with no
time set promises nothing. The road — the delivery adapter's estimate from the
kitchen to the customer; the built-in one divides the straight-line distance by
an average city speed, and an installation with a real routing service plugs in
its own estimate. But the road cannot be shorter than the time the zone
promises: the zone does not deliver faster, even if the kitchen is round the
corner. On top comes a margin for the inaccuracy of the estimates.

The customer can say "I need it no later than in N minutes". Then dishes that
take longer to cook are hidden from the menu and refused by the basket, and at
checkout the full estimate — cooking plus road — is compared. The rule for a
single dish is the same in the menu and in the basket, so the menu does not
show what the basket would later refuse.

An order can also be "for a time", but not earlier than the zone promises. An
order is either "for a time" or "as soon as possible, but no later than N
minutes"; both at once are two different orders, and core does not pick one
for the customer — it refuses.

## Adapters

Three things in core are replaceable: geo (address ↔ coordinate, address
suggestions), delivery (whether it can be delivered, what it costs, how long
the road is) and menu (at which places, what is sold, which kitchen cooks, how
to split the order). Each has an abstract class — the contract core calls — and
a built-in implementation that works by default.

Exactly one adapter of each kind is active at a time, and its name is stored
in a setting. An empty name is the built-in one. A name nobody registered is an
error, not a silent fallback to the built-in one — otherwise a typo in a
setting would turn into a mystery. The built-in menu adapter has two modes, and
they are one and the same instance under two names.

The abstract class holds not only the list of methods but also core's own
rules, the same for any implementation. For the menu these are the filter by
the wait limit, the basket check, the kitchen chain and the default line
placement. An implementation extends the abstract class, not the built-in one;
what is worth reusing from the built-in one is exposed as plain functions in
`lib/`.

The address catalog belongs to the geo adapter, delivery zones to the delivery
adapter. They are touched only by the owner's built-in implementation and its
admin pages, and the pages are shown only while that built-in adapter is
active. If an installation plugs in its own geo adapter, the address catalog
simply stops taking part; the same goes for zones.

To plug in its own adapter, a module extends the contract, registers an
instance under its own name in its hook, and the name goes into the setting.
That is how a multi-kitchen route would plug in: one menu adapter that
overrides which kitchens to read the menu at, how to split the basket and what
to add to the delivery, and takes everything else from core as is. No such
module ships — core holds only the contract.

RMS, payment, bonus and the other adapters keep the old scheme with their own
loaders; what they share with the rest is only the file layout.
