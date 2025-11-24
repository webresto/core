import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function BalanceInput({ value, onChange }) {
    const [balance, setBalance] = useState(value ?? 0);
    const isUnlimited = balance === -1;

    const handleDecrement = () => {
        const newVal = isUnlimited ? 0 : Math.max(0, balance - 1);
        setBalance(newVal);
        onChange(newVal);
    };

    const handleIncrement = () => {
        const newVal = isUnlimited ? 1 : balance + 1;
        setBalance(newVal);
        onChange(newVal);
    };

    const handleInputChange = (ev) => {
        const val = ev.target.value;
        if (val === '' || /^\d+$/.test(val)) {
            const numVal = val === '' ? 0 : Number(val);
            setBalance(numVal);
            onChange(numVal);
        }
    };

    const handleSetUnlimited = () => {
        setBalance(-1);
        onChange(-1);
    };

    return (
        <div className="flex items-center gap-2 mb-4">
            <Button
                onClick={handleDecrement}
                variant="outline"
                size="sm"
                type="button"
                className="h-10 w-10 p-0 text-lg font-bold"
            >
                −
            </Button>

            <Input
                type="text"
                placeholder="0"
                value={isUnlimited ? '∞' : balance}
                onChange={handleInputChange}
                className="flex-1 text-center h-10"
                readOnly={isUnlimited}
            />

            <Button
                onClick={handleIncrement}
                variant="outline"
                size="sm"
                type="button"
                className="h-10 w-10 p-0 text-lg font-bold"
            >
                +
            </Button>

            <Button
                onClick={handleSetUnlimited}
                title="Set to Unlimited"
                variant="outline"
                size="sm"
                type="button"
                className="h-10 w-10 p-0 text-lg font-bold"
            >
                ∞
            </Button>
        </div>
    );
}
