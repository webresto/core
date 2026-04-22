import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { EyeOff, Eye, Hash, Infinity, Square, CheckSquare } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export function GroupToolbox({ dishes, onBulkEnable, onBulkVisibility, onBulkBalance }) {
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
        'disable-all': () => onBulkEnable(dishes.map(d => d.id), false),
        'enable-all': () => onBulkEnable(dishes.map(d => d.id), true),
        'hide-all': () => onBulkVisibility(dishes.map(d => d.id), false),
        'show-all': () => onBulkVisibility(dishes.map(d => d.id), true),
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
            {/* System Enable/Disable */}
            <div className="flex gap-1 border border-border rounded-md p-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'disable-all',
                        t('Disable Dishes'),
                        t('Disable {count} dish(es)?', { count: dishCount })
                    )}
                    title={t('Disable')}
                    className="h-8 px-2"
                >
                    <Square className="w-4 h-4 mr-1 text-red-500" />
                    {t('Disable')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'enable-all',
                        t('Enable Dishes'),
                        t('Enable {count} dish(es)?', { count: dishCount })
                    )}
                    title={t('Enable')}
                    className="h-8 px-2"
                >
                    <CheckSquare className="w-4 h-4 mr-1 text-green-500" />
                    {t('Enable')}
                </Button>
            </div>

            {/* Catalog Visibility */}
            <div className="flex gap-1 border border-border rounded-md p-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'hide-all',
                        t('Hide Dishes'),
                        t('Hide {count} dish(es) from catalog?', { count: dishCount })
                    )}
                    title={t('Hide')}
                    className="h-8 px-2"
                >
                    <EyeOff className="w-4 h-4 mr-1" />
                    {t('Hide')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'show-all',
                        t('Show Dishes'),
                        t('Show {count} dish(es) in catalog?', { count: dishCount })
                    )}
                    title={t('Show')}
                    className="h-8 px-2"
                >
                    <Eye className="w-4 h-4 mr-1" />
                    {t('Show')}
                </Button>
            </div>

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
