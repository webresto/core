import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function DishCard({ dish, balance, onUpdateStock, onUpdateVisibility, onUpdateIsDeleted, onBalanceChange }) {
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

    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{dish.name || '—'}</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateVisibility(dish.id, 'dish', !dish.visible)}
                        title={dish.visible ? 'Hide dish' : 'Show dish'}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                        {dish.visible ? '👁' : '🙈'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="mb-2 text-sm text-muted-foreground">Code: {dish.code || ''}</div>
                <div className="mb-2 text-sm text-muted-foreground">Price: {dish.price ?? ''}</div>

                <div className="mb-4 flex items-center space-x-2">
                    <Checkbox
                        id={`isDeleted-${dish.id}`}
                        checked={!!dish.isDeleted}
                        onCheckedChange={(checked) => onUpdateIsDeleted(dish.id, 'dish', checked)}
                    />
                    <Label htmlFor={`isDeleted-${dish.id}`} className="cursor-pointer">
                        Deleted
                    </Label>
                </div>

                <div className="mb-4">
                    <Label className="block mb-1 font-semibold">Stock:</Label>
                    {isUnlimited ? (
                        <span className="font-bold text-green-600">∞ Unlimited</span>
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
                        title="Set to Unlimited"
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
