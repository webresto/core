import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

const {
    DialogStack, DialogStackTrigger, DialogStackOverlay, DialogStackBody,
    DialogStackContent, DialogStackHeader, DialogStackTitle, DialogStackDescription,
    DialogStackFooter, DialogStackPrevious,
} = window.UIComponents;

export function HelpButton() {
    const { t } = useTranslation();

    return (
        <DialogStack>
            <DialogStackTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0" title={t('How it works')}>
                    <Info className="w-6 h-6" />
                </Button>
            </DialogStackTrigger>
            <DialogStackOverlay />
            <DialogStackBody>
                <DialogStackContent>
                    <DialogStackHeader>
                        <DialogStackTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                            {t('How it works')}
                        </DialogStackTitle>
                        <DialogStackDescription>{t('Stock manager description')}</DialogStackDescription>
                    </DialogStackHeader>

                    <div className="flex flex-col p-6" style={{ gap: 24, overflowY: 'auto' }}>
                        <section>
                            <h3 className="text-base font-semibold flex items-center gap-2" style={{ marginBottom: 6 }}>
                                <span className="border rounded-md flex items-center justify-center text-xs" style={{ width: 24, height: 24 }}>☑</span>
                                {t('Enable / Disable')}
                            </h3>
                            <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                                {t('Enable desc')}
                            </p>
                        </section>

                        <section>
                            <h3 className="text-base font-semibold flex items-center gap-2" style={{ marginBottom: 6, color: 'var(--primary)' }}>
                                <span className="border rounded-md flex items-center justify-center text-xs" style={{ width: 24, height: 24 }}>👁</span>
                                {t('Catalog Visibility')}
                            </h3>
                            <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                                {t('Visible desc')}
                            </p>
                        </section>

                        <section>
                            <h3 className="text-base font-semibold flex items-center gap-2" style={{ marginBottom: 6 }}>
                                <span className="border rounded-md flex items-center justify-center text-xs" style={{ width: 24, height: 24 }}>🔍</span>
                                {t('Show All Filter')}
                            </h3>
                            <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                                {t('Show all desc')}
                            </p>
                        </section>

                        <div className="rounded-md border p-4" style={{ background: 'var(--muted)' }}>
                            <p className="text-xs text-muted-foreground" style={{ fontStyle: 'italic' }}>
                                {t('Stock manager hint')}
                            </p>
                        </div>
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    );
}
