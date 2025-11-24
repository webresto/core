import React, { useState, useEffect } from 'react';

export function Tabs({ tabs, defaultTab }) {
    // Initialize from URL hash or defaultTab
    const getInitialTab = () => {
        if (typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash.substring(1);
            const tabExists = tabs.some(tab => tab.id === hash);
            if (tabExists) return hash;
        }
        return defaultTab || tabs[0]?.id;
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    // Update URL hash when tab changes
    useEffect(() => {
        if (typeof window !== 'undefined' && activeTab) {
            window.history.replaceState(null, '', `#${activeTab}`);
        }
    }, [activeTab]);

    // Listen to hash changes (browser back/forward)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            if (hash && tabs.some(tab => tab.id === hash)) {
                setActiveTab(hash);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', handleHashChange);
            return () => window.removeEventListener('hashchange', handleHashChange);
        }
    }, [tabs]);

    const activeTabContent = tabs.find(tab => tab.id === activeTab);

    return (
        <div className="w-full">
            <div className="border-b border-border mb-6">
                <div className="flex space-x-1" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                px-4 py-2 font-medium text-sm rounded-t-lg transition-colors
                ${activeTab === tab.id
                                    ? 'bg-background text-foreground border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="tab-content">
                {activeTabContent?.content}
            </div>
        </div>
    );
}
