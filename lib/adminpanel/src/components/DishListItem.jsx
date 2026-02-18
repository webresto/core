import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslation } from '../i18n/I18nContext';

export function DishListItem({ dish, balance, onUpdateStock, onUpdateIsDeleted, onBalanceChange }) {
    const { t } = useTranslation();
    const currentBalance = balance ?? dish.balance ?? 0;
    const isUnlimited = currentBalance === -1;

    const handleDecrement = () => {
        const newVal = isUnlimited ? 0 : Math.max(0, currentBalance - 1);
        onBalanceChange(dish.id, newVal);
        onUpdateStock(dish.id, newVal);
    };

    const handleIncrement = () => {
        const newVal = isUnlimited ? 1 : currentBalance + 1;
        onBalanceChange(dish.id, newVal);
        onUpdateStock(dish.id, newVal);
    };

    const handleInputChange = (ev) => {
        const val = ev.target.value;
        if (val === '' || /^\d+$/.test(val)) {
            onBalanceChange(dish.id, val === '' ? 0 : Number(val));
        }
    };

    const handleInputBlur = (ev) => {
        const val = ev.target.value;
        if (val === '∞' || isUnlimited) return;
        const numVal = val === '' ? 0 : Number(val);
        if (!isNaN(numVal)) {
            onUpdateStock(dish.id, numVal);
        }
    };

    const handleSetUnlimited = () => {
        onUpdateStock(dish.id, -1);
    };

    return (
        <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
            {/* Name and Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base truncate">{dish.name || '—'}</h4>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>{t('dish_code')}: {dish.code || '—'}</span>
                    <span>{t('dish_price')}: {dish.price ?? '—'}</span>
                </div>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id={`enable-list-${dish.id}`}
                    checked={!dish.isDeleted}
                    onCheckedChange={(checked) => onUpdateIsDeleted(dish.id, 'dish', !checked)}
                />
                <Label htmlFor={`enable-list-${dish.id}`} className="cursor-pointer text-sm">
                    {t('dish_enable')}
                </Label>
            </div>

            {/* Stock Display */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('dish_stock')}:</span>
                {isUnlimited ? (
                    <span className="font-bold text-green-600">∞</span>
                ) : (
                    <span className="font-mono font-semibold min-w-[2rem] text-right">{currentBalance}</span>
                )}
            </div>

            {/* Stock Controls */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleDecrement}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                >
                    −
                </Button>

                <Input
                    type="text"
                    placeholder="0"
                    value={isUnlimited ? '∞' : currentBalance}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-16 text-center h-8"
                    readOnly={isUnlimited}
                />

                <Button
                    onClick={handleIncrement}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                >
                    +
                </Button>

                <Button
                    onClick={handleSetUnlimited}
                    title={t('dish_set_unlimited')}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                >
                    ∞
                </Button>
            </div>
        </div>
    );
}
