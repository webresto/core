export const UNLIMITED = -1;

/** `null` = the source said nothing, `-1` = unlimited, otherwise a quantity. */
export function formatBalance(value) {
    if (value === null || value === undefined) return '—';
    if (value === UNLIMITED) return '∞';
    return String(value);
}

/**
 * Decides what one dish row shows for the active balance mode.
 *
 * Local stock is the only operator-editable value, so it is always rendered.
 * The read-only RMS and effective values are shown only when they add
 * information: `local-only` ignores them, and in `minimum` mode they are hidden
 * once the effective value is just the local one and RMS has nothing to add.
 * That also keeps the common case quiet — a product with no row at all is
 * unlimited everywhere and would otherwise render "∞" and "—" on every card.
 */
export function getStockView(dish, mode, localBalance) {
    const stored = dish.localBalance ?? null;
    const local = localBalance === undefined ? stored : localBalance;
    const rms = dish.rmsBalance ?? null;
    const effective = dish.balance ?? UNLIMITED;
    const placeEnable = dish.placeEnable !== false;

    // Compared against the loaded row, never against the value being edited:
    // `effective` and `rms` come from the server and lag an optimistic edit by
    // one reload, so using the in-flight local value here would flash the
    // read-only row open on every click.
    // A missing local value means "no limit set here", which is what -1 encodes.
    const storedAsBalance = stored ?? UNLIMITED;
    const addsNothing = effective === storedAsBalance && (rms === null || rms === storedAsBalance);
    const showSecondary = mode === 'local-only' ? false : mode === 'minimum' ? !addsNothing : true;

    return {
        local,
        rms,
        effective,
        placeEnable,
        /** RMS writes `rmsBalance`; the operator must not be able to override it. */
        canEditLocal: mode !== 'rms-only',
        showEffective: showSecondary,
        showRms: showSecondary,
        isUnlimited: local === UNLIMITED,
    };
}
