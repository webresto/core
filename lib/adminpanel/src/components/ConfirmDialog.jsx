import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BalanceInput } from './BalanceInput';

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    needsBalanceInput = false,
    confirmText = "Confirm",
    cancelText = "Cancel"
}) {
    const [balanceValue, setBalanceValue] = useState(0);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(needsBalanceInput ? balanceValue : null);
        setBalanceValue(0);
        onClose();
    };

    const handleCancel = () => {
        setBalanceValue(0);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleCancel}
            />

            {/* Dialog */}
            <div className="relative bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="text-muted-foreground mb-4">{message}</p>

                {needsBalanceInput && (
                    <BalanceInput
                        value={balanceValue}
                        onChange={setBalanceValue}
                    />
                )}

                <div className="flex gap-2 justify-end">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
