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
                        t('dialog_disable_title'),
                        t('dialog_disable_msg', { count: dishCount })
                    )}
                    title={t('toolbox_disable')}
                    className="h-8 px-2"
                >
                    <Square className="w-4 h-4 mr-1 text-red-500" />
                    {t('toolbox_disable')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'enable-all',
                        t('dialog_enable_title'),
                        t('dialog_enable_msg', { count: dishCount })
                    )}
                    title={t('toolbox_enable')}
                    className="h-8 px-2"
                >
                    <CheckSquare className="w-4 h-4 mr-1 text-green-500" />
                    {t('toolbox_enable')}
                </Button>
            </div>

            {/* Catalog Visibility */}
            <div className="flex gap-1 border border-border rounded-md p-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'hide-all',
                        t('dialog_hide_title'),
                        t('dialog_hide_msg', { count: dishCount })
                    )}
                    title={t('toolbox_hide')}
                    className="h-8 px-2"
                >
                    <EyeOff className="w-4 h-4 mr-1" />
                    {t('toolbox_hide')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'show-all',
                        t('dialog_show_title'),
                        t('dialog_show_msg', { count: dishCount })
                    )}
                    title={t('toolbox_show')}
                    className="h-8 px-2"
                >
                    <Eye className="w-4 h-4 mr-1" />
                    {t('toolbox_show')}
                </Button>
            </div>

            {/* Balances */}
            <div className="flex gap-1 border border-border rounded-md p-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'set-balance',
                        t('dialog_balance_title'),
                        t('dialog_balance_msg', { count: dishCount }),
                        true
                    )}
                    title={t('toolbox_set_balance')}
                    className="h-8 px-2"
                >
                    <Hash className="w-4 h-4 mr-1" />
                    {t('toolbox_set_balance')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDialog(
                        'set-unlimited',
                        t('dialog_unlimited_title'),
                        t('dialog_unlimited_msg', { count: dishCount })
                    )}
                    title={t('toolbox_set_unlimited')}
                    className="h-8 px-2"
                >
                    <Infinity className="w-4 h-4 mr-1" />
                    {t('toolbox_set_unlimited')}
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
