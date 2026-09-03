import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { Hash, Infinity } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export function GroupToolbox({ dishes, onBulkBalance }) {
    const { t } = useTranslation();
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        type: null,
        title: '',
        message: '',
        needsInput: false
    });

    const dishCount = dishes.length;

    const openDialog = (type, title, message, needsInput = false) => {
        setDialogState({
            isOpen: true,
            type,
            title,
            message,
            needsInput
        });
    };

    const closeDialog = () => {
        setDialogState({
            isOpen: false,
            type: null,
            title: '',
            message: '',
            needsInput: false
        });
    };

    const dialogHandlers = {
        'set-balance': (val) => onBulkBalance(dishes.map(d => d.id), val),
        'set-unlimited': () => onBulkBalance(dishes.map(d => d.id), -1)
    };

    const handleConfirm = (balanceValue) => {
        const handler = dialogHandlers[dialogState.type];
        if (handler) {
            handler(balanceValue);
        }
        closeDialog();
    };

    return (
        <div className="flex gap-2 mb-4 flex-wrap">
            {/* Balances */}
            <div className="flex gap-1 border border-border rounded-md p-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'set-balance',
                        t('Set Balance'),
                        t('Set balance for {count} dish(es):', { count: dishCount }),
                        true
                    )}
                    title={t('Set Balance')}
                    className="h-8 px-2"
                >
                    <Hash className="w-4 h-4 mr-1" />
                    {t('Set Balance')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'set-unlimited',
                        t('Set Unlimited'),
                        t('Set unlimited stock for {count} dish(es)?', { count: dishCount })
                    )}
                    title={t('Set Unlimited')}
                    className="h-8 px-2"
                >
                    <Infinity className="w-4 h-4 mr-1" />
                    {t('Set Unlimited')}
                </Button>
            </div>

            <ConfirmDialog
                isOpen={dialogState.isOpen}
                onClose={closeDialog}
                onConfirm={handleConfirm}
                title={dialogState.title}
                message={dialogState.message}
                needsBalanceInput={dialogState.needsInput}
            />
        </div>
    );
}
