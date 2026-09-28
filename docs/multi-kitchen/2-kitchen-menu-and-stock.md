# The order's kitchen, the menu and stock

## Which kitchen cooks

Every order is assigned a kitchen. It is kept first in the order's list of
kitchens; while the basket is empty and has no address the list may be empty,
and that is normal. The kitchen is recalculated on every basket change until
the order is placed.

For pickup and dine-in it is simple: the chosen place cooks, if it is a
kitchen. If the place only hands out orders, the order has no kitchen.

For delivery the kitchen is chosen by a chain of strategies the installation
configures. The strategies are asked in turn, and the first to name a kitchen
wins. "By zone" looks at the zone the customer fell into and takes the kitchen
standing inside that zone; if there are several, the nearest one. "Nearest"
takes the nearest open kitchen, but not beyond a set radius. "Single" takes
the default kitchen from the settings, or the only enabled one. There is also
an "ask the RMS" strategy, but RMS adapters do not implement it yet, and it
always passes the turn on. With an empty chain no kitchen is assigned at all —
that is how an installation that does not care about the kitchen works.

The zone's kitchen and the zone's tariff are separate questions. If a zone has
no open kitchen, the next strategy finds one, while the delivery price still
comes from the zone the customer fell into.

Every strategy leaves a trace: which one answered and why the others passed.
It goes into the order log and to the storefront as diagnostics, so the
question "why did the order go to this kitchen" always has an answer.

When the kitchen changes — the customer changed the address — items the new
kitchen does not have leave the basket, and the customer gets a message saying
exactly what was removed.

## Stock per place

Stock is a property not of a dish but of a "dish + place" pair. Each pair may
have a row with three values: the stock kept by the operator, the stock sent by
the RMS, and a switch for the dish at this place. Stock `-1` means "no limit",
`0` is a stop, a positive number is how much is left. The switch beats any
stock: that is how a place drops a dish without touching the numbers.

The operator and the RMS each write their own column and never overwrite each
other. Which stock is the real one is decided by a setting: the smaller of the
two (the default), the operator's only, or the RMS's only.

The main rule: no row means no limit. A row appears only when a real limit
appears: the operator set a number, the RMS sent a stop, the dish was switched
off at the place. When a row limits nothing again, it is deleted. So a hundred
dishes on five kitchens do not produce five hundred empty rows.

The RMS sends a stop list as a full snapshot. If it knows nothing about
terminals, the snapshot lands on every enabled kitchen. If it does, each
snapshot lands on its own place by terminal id, and the other places are left
alone. The RMS changes a dish's switch only when it sends it explicitly:
turning dishes on and off is the operator's call until the RMS says otherwise
outright.

After checkout the sold amount is taken off the operator's stock of the order's
kitchen. The RMS stock is not touched — the next synchronisation rewrites it.

The operator edits stock on the Stock Manager page: first picks a kitchen, then
changes the numbers and switches of its dishes. Rights are granted per place —
the operator of one kitchen does not see the stock of another.

## Menu

What the customer is shown is decided by the menu adapter. The built-in one
has two modes. In the ordinary mode there is one menu for everyone, and a place
only refines what to hide. In single-place mode the menu is always tied to a
particular kitchen, and until the kitchen is known nothing can be put into the
basket — the customer is asked to choose an address or a place.

Before returning the menu, the adapter works out which kitchens to read stock
at. The order is: the kitchen asked about explicitly; the order's kitchen; the
kitchen chosen from the customer's coordinate by the same chain as for the
order; when the basket has only a city — all kitchens of that city at once;
and finally the default kitchen. A product is in the menu if it is available at
least at one of these kitchens. Because choosing the kitchen for the menu and
for the order is one and the same chain, the customer sees exactly what the
order's kitchen will then cook.

The "can this be sold" check is one for the menu, the basket and the
recalculation. It answers two different questions, and they are kept apart on
purpose. Can this product be sold at this place — that is about the switch,
the stop and the amount, and a refusal removes one line. Can the place take an
order at all — that is about being enabled and the schedule, and a refusal
concerns the whole order.

A product has a type: dish, ready product or service. Only a dish is cooked — a
bottle of water and the delivery itself do not move the time.

## An order from several kitchens

Sometimes no kitchen has the whole order: pizza is on the north kitchen, sushi
only on the south one. Then the order can be split across kitchens, and the
courier collects it on the way.

Core makes room for this but does not build the route itself. On every basket
recalculation it asks the menu adapter once where each line is cooked, and
writes down the answer: on the order — the list of kitchens in driving order,
on each line — its kitchen, and the amount is trimmed to that kitchen's stock.
After the delivery is priced, the menu adapter may add a surcharge for the
extra stops. The built-in adapter answers both questions simply: everything on
one kitchen, no surcharge.

The route is built by the `multi-place-router` module, which plugs in as a
separate menu adapter. A route exists only for courier delivery — pickup and
dine-in are always one place. Stops are taken only in the city of the order's
kitchen: nobody drives to another city on the way, however close it is. If the
route does not work out, the order is judged by its own kitchen's stock, as
usual.

An order across several kitchens can be placed only if the RMS declared it can
take such orders; otherwise checkout refuses. Silently reducing the order to
one kitchen would be the worst option: the RMS would take it as one kitchen's
work, and the customer would wait for food nobody is cooking.

The operator sees the route on the kanban: on the card — "kitchen → kitchen ·
zone" and the number of kitchens, in the order card — the stops in order and
what to collect at each.
