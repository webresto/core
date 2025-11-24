import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { EyeOff, Eye, Hash, Infinity } from 'lucide-react';

export function GroupToolbox({ dishes, onBulkVisibility, onBulkBalance }) {
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
                    'Disable All Dishes',
                    `Set ${dishCount} dish${dishCount !== 1 ? 'es' : ''} as invisible?`
                )}
                title="Disable all dishes in this group"
            >
                <EyeOff className="w-4 h-4 mr-2" />
                Disable
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'show-all',
                    'Enable All Dishes',
                    `Set ${dishCount} dish${dishCount !== 1 ? 'es' : ''} as visible?`
                )}
                title="Enable all dishes in this group"
            >
                <Eye className="w-4 h-4 mr-2" />
                Enable
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'set-balance',
                    'Set Balance',
                    `Set balance for all ${dishCount} dish${dishCount !== 1 ? 'es' : ''} to:`,
                    true
                )}
                title="Set specific balance for all dishes"
            >
                <Hash className="w-4 h-4 mr-2" />
                Set Balance
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(
                    'set-unlimited',
                    'Set Unlimited',
                    `Set ${dishCount} dish${dishCount !== 1 ? 'es' : ''} to unlimited balance?`
                )}
                title="Set unlimited balance for all dishes"
            >
                <Infinity className="w-4 h-4 mr-2" />
                Set Unlimited
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
