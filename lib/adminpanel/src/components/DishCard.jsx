import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '../i18n/I18nContext';
import { PlaceEnableToggle, StockBalancePanel } from './StockBalancePanel';

const { Badge } = window.UIComponents;

export function DishCard({
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
        <Card className={disabledHere ? 'relative opacity-60 bg-muted/50' : 'relative'}>
            <CardHeader className="p-4 pb-2 space-y-0">
                <CardTitle className="text-lg leading-tight">{dish.name || '—'}</CardTitle>
                <div className="flex items-center gap-2 pt-2">
                    {canManage && (
                        <PlaceEnableToggle dish={dish} onToggleEnable={onToggleEnable} />
                    )}
                    {disabledHere && (
                        <Badge variant="destructive" style={{ fontSize: 10, padding: '1px 5px' }}>
                            {t('Disabled here')}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            {/* Grows to the row height so the stock block can sit at the bottom. */}
            <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                <div className="mb-2 text-sm text-muted-foreground">{t('Code')}: {dish.code || ''}</div>
                <div className="mb-3 text-sm text-muted-foreground">{t('Price')}: {dish.price ?? ''}</div>

                {/*
                  * Pinned to the bottom: the read-only Effective/RMS line above it
                  * appears only when it adds information, and without this the
                  * control would ride up on every card that hides it.
                  */}
                <div className="mt-auto">
                    <StockBalancePanel
                        dish={dish}
                        mode={mode}
                        localBalance={localBalance}
                        onUpdateStock={onUpdateStock}
                        onLocalBalanceChange={onLocalBalanceChange}
                        canManage={canManage}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
