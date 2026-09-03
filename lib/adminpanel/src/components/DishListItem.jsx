import React from 'react';
import { useTranslation } from '../i18n/I18nContext';
import { PlaceEnableToggle, StockBalancePanel } from './StockBalancePanel';

const { Badge } = window.UIComponents;

export function DishListItem({
    dish,
    mode,
    localBalance,
    onUpdateStock,
    onLocalBalanceChange,
    onToggleEnable,
    canManage = false,
}) {
    const { t } = useTranslation();
    const disabledHere = dish.placeEnable === false;

    return (
        <div
            className={`flex items-center gap-4 p-4 border border-border rounded-lg transition-colors ${
                disabledHere ? 'opacity-60 bg-muted/50' : 'bg-card hover:bg-muted/50'
            }`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-base truncate">{dish.name || '—'}</h4>
                    {disabledHere && (
                        <Badge variant="destructive" style={{ fontSize: 10, padding: '1px 5px' }}>
                            {t('Disabled here')}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    {canManage && (
                        <PlaceEnableToggle dish={dish} onToggleEnable={onToggleEnable} />
                    )}
                    <span>{t('Code')}: {dish.code || '—'}</span>
                    <span>{t('Price')}: {dish.price ?? '—'}</span>
                </div>
            </div>

            <StockBalancePanel
                dish={dish}
                mode={mode}
                localBalance={localBalance}
                onUpdateStock={onUpdateStock}
                onLocalBalanceChange={onLocalBalanceChange}
                canManage={canManage}
                size="sm"
                compact
            />
        </div>
    );
}
