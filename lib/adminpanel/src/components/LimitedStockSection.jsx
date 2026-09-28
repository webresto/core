import React from 'react';
import { DishesGrid } from './DishesGrid';
import { useTranslation } from '../i18n/I18nContext';

export function LimitedStockSection({
    items,
    mode,
    localBalances,
    onUpdateStock,
    onLocalBalanceChange,
    onToggleEnable,
    canManage = false
}) {
    const { t } = useTranslation();

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 rounded-full mb-4" style={{ background: 'var(--accent)' }}>
                    <div className="text-2xl">🎉</div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('Everything is in stock!')}</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                    {t('Great job! All your dishes are currently available. You can check your settings or explore other dishes.')}
                </p>
                <div className="flex gap-3">
                    <a
                        href="#explore"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        {t('Explore Dishes')}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <DishesGrid
                dishes={items}
                mode={mode}
                localBalances={localBalances}
                onUpdateStock={onUpdateStock}
                onLocalBalanceChange={onLocalBalanceChange}
                onToggleEnable={onToggleEnable}
                title={t('Items with limited stock')}
                canManage={canManage}
            />
        </div>
    );
}
