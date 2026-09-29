# Places, addresses and delivery zones

In core, a restaurant is a set of places in one or more cities. A place is any
location of the business: a kitchen where food is cooked, a pickup counter, a
dining room where guests can eat. There is no separate "kitchen" entity: every
place has flags, and the same place can cook, hand out orders and seat guests
in any combination. A counter in a shopping mall, for example, would only hand
out orders cooked somewhere else — a case not supported for now: pickup and
dine-in are taken only at a place that cooks.

A place has a coordinate on the map, a city, a schedule, an on/off switch and
a terminal id in the RMS. The coordinate is how core tells which kitchen is
closer to the customer and which delivery zone the kitchen stands in. The city
is what the storefront uses to list the places of the chosen city, and what
keeps a courier from driving to the next city for part of an order. The
terminal id is what makes an RMS stop list land on the place it belongs to.

A place is working when it is enabled and open by its schedule at the moment
that matters — now, or the time of a pre-order. The rule is the same
everywhere in core: it chooses the kitchen, it makes checkout refuse a closed
place, and it decides which places the storefront lists. A closed kitchen does
not touch baskets — their items stay, the order simply cannot be placed with a
closed place.

## City

The server has no city of its own. The city is the customer's choice: they pick
it on the storefront, and from then on the city travels with the address.
Places, zones and addresses know which city they belong to. A city may carry
the URL of its own backend — for franchises where every city runs its own
server, and the storefront switches to it when the city changes.

## Order type

An order is one of three kinds: delivery, pickup and dine-in. Delivery needs an
address — it gives the zone, the tariff and the kitchen. Pickup needs a place
that hands out orders, dine-in a place with a dining room. At checkout core
checks that the chosen place exists, serves this kind of order and is open.

## Addresses

An address is a tree kept in one table. Every node — a street, a house, a
quarter, a shopping mall, an entrance, a range of houses — knows its city, its
parent and its type. What may come after a node is answered by its children:
in one city a street comes right after the city, in another a quarter, with a
street inside the quarter. There is no description of "a city's structure",
and none is needed.

Rules apply to node types only. Which types exist, which ones a search may
start from at the city, and which node is an address by itself (a house, a
building, a mall need no house number) — that is known by the geo adapter. A
node may have a point on the map; a node without one takes the nearest
ancestor that has it. A range of houses ("1–50") stores its bounds and is used
where a street is long and its parts lie in different zones.

Nodes are created by hand in the admin panel, from a file (the address upload
page checks the whole file and shows every error at once), or arrive from the
RMS as streets.

On an order the address is one flat shape: the node the customer chose, a
ready line "Lenina, 12" for the operator and the courier, the city, the house
number, and what only the recipient knows: building, apartment, entrance,
floor, door phone, comment. When the coordinate is known up front — say, the
customer pressed "Detect my location" — it sits there too. An address counts
as given when it has a node, a line or a coordinate; a city alone is not
enough.

Turning an address into a coordinate and back is the geo adapter's job. The
built-in one first takes the coordinate from the address itself, then the
point of the node or of its ancestors, and only when there is nothing asks
Nominatim, sending the path down to the house and the number (apartments and
entrances only confuse a geocoder). The other way, from a coordinate to an
address, it goes through the reverse geocoder, the catalog and the nearest
node, and at worst returns free text.

A customer's saved addresses appear on their own: when a delivery order is
completed, its address is remembered for the user unless they already have it.
There is no separate "save this address" button.

## Delivery zones

The price and the time of a delivery are set by a zone and by nothing else. A
zone is a polygon on the map with a tariff: delivery time, cost (or a delivery
product instead of a cost), minimum order total, the total from which delivery
is free, a message for the customer, and a schedule. Time and cost are
mandatory on a zone — without them a zone promises nothing and charges
nothing, which is no tariff at all.

To price a delivery, the address is turned into a coordinate, and among the
enabled zones the first in order that contains the coordinate is taken. From
there it is simple: the zone is closed by schedule — refused; the basket is
below the minimum — refused, with the amount; above the threshold — free;
otherwise — the zone's cost or its delivery product. Along with the price the
answer says which zone answered, and carries diagnostic lines: what was tried
and why it did not work.

The zone is not written onto the order. It is an intermediate result of the
calculation and lives inside the delivery answer. Keeping a copy would give the
order two different answers to one question once the map is redrawn.

When no zone is found, core tells why. With no zones at all there is nothing
to deliver with, and that is always a refusal. With the coordinate outside
every zone, the "outside the zones" price from the settings is used, and
without one it is a refusal. When no coordinate could be obtained, that is not
a reason to refuse right away either.

In the last two cases soft calculation applies — it is on by default. The order
is accepted, and a manager agrees the delivery cost by phone. The customer
sees the same message in the address popup, in the basket and at checkout, so
one screen never says "we don't deliver there" while the next one takes the
order. A delivery basket that has no address yet gets the same answer.

Zones can be grouped into layers. A layer is the same kind of row, only without
a polygon. A layer has a switch: either its tariff applies to every zone in it
(handy when five districts cost the same), or the layer only groups and each
zone prices itself. A disabled layer disables its zones, and the order is made
of the layer's position and the zone's position inside it. Layers do not nest.

Zones are drawn and edited on a dedicated admin page with a map. A KML or
GeoJSON file can be uploaded there too. Or a Google My Maps link can be given
(per city, when there are several), and core will fetch the polygons from it on
a schedule. Such a zone has two owners: the map owns the geometry and the name,
the operator owns the tariff, the schedule, the switch and the order.
Synchronisation never touches what belongs to the operator. A map snapshot is
applied whole or not at all. A new zone arrives disabled, and a zone that
disappeared from the map is not deleted, only marked — deleting it is the
operator's call. The polygons of a city that has a map link are locked in the
admin panel, because the next run would overwrite them anyway.

All of this about zones is the built-in delivery adapter. An installation that
prices delivery its own way plugs in its own adapter, and core's zones, their
page and the synchronisation simply stop taking part.
