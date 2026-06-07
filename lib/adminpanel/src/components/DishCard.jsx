import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTranslation } from '../i18n/I18nContext';
import { Eye, EyeOff } from 'lucide-react';

export function DishCard({ dish, balance, onUpdateStock, onUpdateEnable, onUpdateVisible, onBalanceChange }) {
    const { t } = useTranslation();
    const currentBalance = balance ?? dish.balance ?? 0;
    const isUnlimited = currentBalance === -1;

    const handleDecrement = () => {
        // If unlimited, set to 0, otherwise decrement
        const newVal = isUnlimited ? 0 : Math.max(0, currentBalance - 1);
        onBalanceChange(dish.id, newVal);
        onUpdateStock(dish.id, newVal);
    };

    const handleIncrement = () => {
        // If unlimited, set to 1, otherwise increment
        const newVal = isUnlimited ? 1 : currentBalance + 1;
        onBalanceChange(dish.id, newVal);
        onUpdateStock(dish.id, newVal);
    };

    const handleInputChange = (ev) => {
        const val = ev.target.value;
        onBalanceChange(dish.id, val === '' ? 0 : Number(val));
    };

    const handleInputBlur = (ev) => {
        const val = ev.target.value;
        // Don't update if unlimited (∞)
        if (val === '∞' || isUnlimited) return;
        const numVal = val === '' ? 0 : Number(val);
        // Only update if it's a valid number
        if (!isNaN(numVal)) {
            onUpdateStock(dish.id, numVal);
        }
    };

    const handleSetUnlimited = () => {
        onUpdateStock(dish.id, -1);
    };

    const toggleVisibility = (e) => {
        // Prevent clicking the card if we're inside a header
        e.stopPropagation();
        onUpdateVisible(dish.id, 'dish', !dish.visible);
    };

    return (
        <Card className="relative">
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg leading-tight pr-6">{dish.name || '—'}</CardTitle>
                <button 
                    onClick={toggleVisibility}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    title={t('Visible in menu (publicity)')}
                >
                    {dish.visible !== false ? (
                         <Eye className="w-5 h-5" />
                    ) : (
                         <EyeOff className="w-5 h-5" style={{ color: 'var(--destructive)' }} />
                    )}
                </button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="mb-2 text-sm text-muted-foreground">{t('Code')}: {dish.code || ''}</div>
                <div className="mb-2 text-sm text-muted-foreground">{t('Price')}: {dish.price ?? ''}</div>

                <div className="mb-4 flex items-center space-x-2">
                    <Checkbox
                        id={`enable-${dish.id}`}
                        checked={dish.enable !== false}
                        onCheckedChange={(checked) => onUpdateEnable(dish.id, 'dish', checked === true)}
                    />
                    <Label htmlFor={`enable-${dish.id}`} className="cursor-pointer">
                        {t('Active (adm. status)')}
                    </Label>
                </div>

                <div className="mb-4">
                    <Label className="block mb-1 font-semibold">{t('Stock')}:</Label>
                    {isUnlimited ? (
                        <span className="font-bold" style={{ color: '#16a34a' }}>∞ {t('Unlimited')}</span>
                    ) : (
                        <Input
                            type="number"
                            value={currentBalance}
                            readOnly
                            className="w-24 bg-transparent border-none p-0 h-auto font-mono"
                        />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleDecrement}
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 text-lg font-bold"
                    >
                        −
                    </Button>

                    <Input
                        type="text"
                        placeholder="0"
                        value={isUnlimited ? '∞' : currentBalance}
                        onChange={(ev) => {
                            const val = ev.target.value;
                            // Allow empty string or valid non-negative numbers
                            if (val === '' || /^\d+$/.test(val)) {
                                onBalanceChange(dish.id, val === '' ? 0 : Number(val));
                            }
                        }}
                        onBlur={handleInputBlur}
                        className="w-20 text-center h-10"
                        readOnly={isUnlimited}
                    />

                    <Button
                        onClick={handleIncrement}
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 text-lg font-bold"
                    >
                        +
                    </Button>

                    <Button
                        onClick={handleSetUnlimited}
                        title={t('Set to Unlimited')}
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 text-lg font-bold"
                    >
                        ∞
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
