import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export function HelpButton() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => setIsOpen(!isOpen);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="rounded-full w-10 h-10 p-0"
                title={t('help_title') || 'Help'}
            >
                <Info className="w-6 h-6" />
            </Button>

            {/* Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                    onClick={toggle}
                />
            )}

            {/* Side Panel */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-500" />
                            {t('help_title') || 'How it works'}
                        </h2>
                        <Button variant="ghost" size="sm" onClick={toggle} className="p-1 h-auto">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <section>
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md border flex items-center justify-center text-xs">☑</span>
                                {t('help_enable_title') || 'Enable / Disable'}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('help_enable_desc') || 'Administrative switch. Disabling an item completely removes it from active operations. However, if it was already in a user\'s cart, they might still see it there until they checkout (though it will fail validation).'}
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-600">
                                <span className="w-6 h-6 rounded-md border border-blue-200 flex items-center justify-center text-xs">👁</span>
                                {t('help_visible_title') || 'Catalog Visibility'}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('help_visible_desc') || 'Marketing switch. Hiding an item keeps it enabled in the system but removes it from the catalog browse view. Useful for secret menu items or items accessible only via direct links / recommendations.'}
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md border flex items-center justify-center text-xs">🔍</span>
                                {t('help_show_all_title') || 'Show All Filter'}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('help_show_all_desc') || 'By default, the Stock Manager hides disabled and hidden items to keep the view clean. Use the "Show All" toggle (magnifying glass) to reveal everything for management.'}
                            </p>
                        </section>

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-700 italic">
                                {t('help_hint') || 'Tip: You can use bulk actions in the folder view to quickly manage multiple items at once.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
