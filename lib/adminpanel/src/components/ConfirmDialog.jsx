import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BalanceInput } from './BalanceInput';
import { useTranslation } from '../i18n/I18nContext';

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    needsBalanceInput = false,
    confirmText,
    cancelText
}) {
    const { t } = useTranslation();
    const effectiveConfirmText = confirmText || t('dialog_confirm');
    const effectiveCancelText = cancelText || t('dialog_cancel');
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
                        {effectiveCancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                    >
                        {effectiveConfirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
