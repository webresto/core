/**
 * The point the admin panel is looking at — one per browser, shared by Stock Manager and the orders
 * board (plan C1): choosing «Ленина, 5» on one of them opens the other on the same point, because a
 * member of staff works at one point and should not have to say so twice.
 *
 * Each module still keeps its own exact selection: their lists of points are not the same — the
 * board also offers pickup points and «Без кухни» — and a value the other module cannot show would
 * otherwise leave it with nothing selected. The shared key holds real points only.
 */
export const CURRENT_PLACE_KEY = 'restoCurrentPlaceId';

/** Where Stock Manager kept it before the key became shared. */
const LEGACY_STOCK_KEY = 'stockManagerPlaceId';

export function readCurrentPlace() {
  try {
    return localStorage.getItem(CURRENT_PLACE_KEY) || localStorage.getItem(LEGACY_STOCK_KEY) || '';
  } catch {
    return '';
  }
}

export function writeCurrentPlace(placeId) {
  try {
    localStorage.setItem(CURRENT_PLACE_KEY, placeId || '');
  } catch {
    // a browser with storage switched off keeps the choice for this page only
  }
}
