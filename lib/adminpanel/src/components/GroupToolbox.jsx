import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { EyeOff, Eye, Hash, Infinity } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export function GroupToolbox({ dishes, onBulkVisibility, onBulkBalance }) {
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

    const handleConfirm = (balanceValue) => {
        const dishIds = dishes.map(d => d.id);

        switch (dialogState.type) {
            case 'hide-all':
                onBulkVisibility(dishIds, false);
                break;
            case 'show-all':
                onBulkVisibility(dishIds, true);
                break;
            case 'set-balance':
                if (balanceValue !== null && balanceValue !== undefined) {
                    onBulkBalance(dishIds, balanceValue);
                }
                break;
            case 'set-unlimited':
                onBulkBalance(dishIds, -1);
                break;
        }
        closeDialog();
    };

    return (
        <div className="flex gap-2 mb-4 flex-wrap">
            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'hide-all',
                    t('dialog_disable_title'),
                    t('dialog_disable_msg', { count: dishCount })
                )}
                title={t('toolbox_disable')}
            >
                <EyeOff className="w-4 h-4 mr-2" />
                {t('toolbox_disable')}
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'show-all',
                    t('dialog_enable_title'),
                    t('dialog_enable_msg', { count: dishCount })
                )}
                title={t('toolbox_enable')}
            >
                <Eye className="w-4 h-4 mr-2" />
                {t('toolbox_enable')}
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'set-balance',
                    t('dialog_balance_title'),
                    t('dialog_balance_msg', { count: dishCount }),
                    true
                )}
                title={t('toolbox_set_balance')}
            >
                <Hash className="w-4 h-4 mr-2" />
                {t('toolbox_set_balance')}
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'set-unlimited',
                    t('dialog_unlimited_title'),
                    t('dialog_unlimited_msg', { count: dishCount })
                )}
                title={t('toolbox_set_unlimited')}
            >
                <Infinity className="w-4 h-4 mr-2" />
                {t('toolbox_set_unlimited')}
            </Button>

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
