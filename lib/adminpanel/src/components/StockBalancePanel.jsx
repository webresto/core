import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '../i18n/I18nContext';
import { formatBalance, getStockView, UNLIMITED } from '../lib/stock-view';

const { Badge } = window.UIComponents;
const { Power, PowerOff } = window.LucideReact;

/**
 * Read-only summary of the values the operator cannot edit.
 *
 * Effective stock is what availability logic uses; RMS stock is written by
 * synchronization. Both are derived, so they sit above the editable control.
 */
function SecondaryBalances({ view, compact = false }) {
    const { t } = useTranslation();
    if (!view.showEffective && !view.showRms) return null;

    return (
        <div className={compact ? 'flex flex-wrap items-center gap-3' : 'flex flex-wrap items-center gap-3 mb-3'}>
            {view.showEffective && (
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t('Effective stock')}:</span>
                    <Badge variant="secondary" style={{ fontSize: 11, padding: '1px 6px' }}>
                        {formatBalance(view.effective)}
                    </Badge>
                </div>
            )}
            {view.showRms && (
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t('RMS stock')}:</span>
                    <Badge variant="outline" style={{ fontSize: 11, padding: '1px 6px' }}>
                        {formatBalance(view.rms)}
                    </Badge>
                </div>
            )}
        </div>
    );
}

/**
 * The single editable stock value: the operator balance of the selected point.
 *
 * It is bound to `localBalance`, not to the effective balance, so a reload
 * cannot overwrite the edit with a value computed from another source.
 */
function LocalBalanceControl({ dish, view, onUpdateStock, onLocalBalanceChange, size = 'default', disabled = false }) {
    const { t } = useTranslation();
    const buttonClass = size === 'sm' ? 'h-8 w-8 p-0' : 'h-10 w-10 p-0 text-lg font-bold';
    const inputClass = size === 'sm' ? 'w-16 text-center h-8' : 'w-20 text-center h-10';

    // No local value yet means unlimited, so stepping down starts from "none left".
    const current = view.local ?? UNLIMITED;
    const isUnlimited = current === UNLIMITED;

    const commit = (value) => {
        onLocalBalanceChange(dish.id, value);
        onUpdateStock(dish.id, value);
    };

    const handleInputChange = (ev) => {
        const val = ev.target.value;
        if (val === '' || /^\d+$/.test(val)) {
            onLocalBalanceChange(dish.id, val === '' ? 0 : Number(val));
        }
    };

    const handleInputBlur = (ev) => {
        const val = ev.target.value;
        if (val === '∞' || isUnlimited) return;
        const numVal = val === '' ? 0 : Number(val);
        if (!isNaN(numVal)) onUpdateStock(dish.id, numVal);
    };

    return (
        <div className="flex items-center gap-2" title={disabled ? t('Disabled here') : undefined}>
            <Button
                onClick={() => commit(isUnlimited ? 0 : Math.max(0, current - 1))}
                variant="outline"
                size="sm"
                title={t('Decrease')}
                className={buttonClass}
                disabled={disabled}
            >
                −
            </Button>

            <Input
                type="text"
                placeholder="0"
                value={isUnlimited ? '∞' : current}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={inputClass}
                readOnly={isUnlimited}
                disabled={disabled}
            />

            <Button
                onClick={() => commit(isUnlimited ? 1 : current + 1)}
                variant="outline"
                size="sm"
                title={t('Increase')}
                className={buttonClass}
                disabled={disabled}
            >
                +
            </Button>

            <Button
                onClick={() => commit(UNLIMITED)}
                title={t('Set to Unlimited')}
                variant="outline"
                size="sm"
                className={buttonClass}
                disabled={disabled}
            >
                ∞
            </Button>
        </div>
    );
}

/**
 * Point-local switch. Disabling stops the product at this kitchen only.
 *
 * It belongs to the product, not to its stock, so it is rendered next to the
 * name rather than inside the balance block.
 */
export function PlaceEnableToggle({ dish, onToggleEnable }) {
    const { t } = useTranslation();
    const placeEnable = dish.placeEnable !== false;
    const Icon = placeEnable ? Power : PowerOff;

    return (
        <Button
            onClick={() => onToggleEnable(dish.id, !placeEnable)}
            variant={placeEnable ? 'outline' : 'destructive'}
            size="sm"
            title={placeEnable ? t('Disable at this point') : t('Enable at this point')}
            className="h-7 w-7 p-0"
        >
            <Icon className="w-4 h-4" />
        </Button>
    );
}

/**
 * Stock block shared by the card and the list row.
 *
 * Layout follows the read/write split: derived values on top, the one editable
 * value at the bottom.
 */
export function StockBalancePanel({
    dish,
    mode,
    localBalance,
    onUpdateStock,
    onLocalBalanceChange,
    canManage = false,
    size = 'default',
    compact = false,
}) {
    const { t } = useTranslation();
    const view = getStockView(dish, mode, localBalance);

    return (
        <div className={compact ? 'flex flex-wrap items-center gap-4' : ''}>
            <SecondaryBalances view={view} compact={compact} />

            <div className={compact ? 'flex items-center gap-2' : ''}>
                {/* Label only — the value itself is right below, in the input. */}
                <span className={compact ? 'text-xs text-muted-foreground' : 'block mb-1 text-sm font-semibold'}>
                    {t('Local stock')}
                </span>

                {canManage && view.canEditLocal ? (
                    <LocalBalanceControl
                        dish={dish}
                        view={view}
                        onUpdateStock={onUpdateStock}
                        onLocalBalanceChange={onLocalBalanceChange}
                        size={size}
                        // Editing stock while the product is switched off changes
                        // nothing visible: `enable` wins over both balances.
                        disabled={!view.placeEnable}
                    />
                ) : (
                    <Badge variant="secondary" style={{ fontSize: 11, padding: '1px 6px' }}>
                        {formatBalance(view.local)}
                    </Badge>
                )}
            </div>
        </div>
    );
}
