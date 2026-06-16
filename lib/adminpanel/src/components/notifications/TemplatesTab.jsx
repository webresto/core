import React, { useMemo, useState } from 'react';
import { styles } from './shared';
import { TemplateFields, VariablesHint } from './TemplateFields';
import TranslationsPopup from './TranslationsPopup';

const { Label, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } = window.UIComponents;

/**
 * Templates tab: base template + channel-specific overrides. Per-locale translations are edited
 * in a popup (Translations) opened from next to the base template; they live in the rule's
 * templates.locales (NotificationRules model) and are saved together with the rule.
 */
export default function TemplatesTab({ draft, updateDraft, t, locales, channels, contextKeys, contextPaths, defaultLocale }) {
  const templates = draft.templates || { default: {}, locales: {}, channels: {} };
  const channelTemplates = templates.channels || {};
  const existingOverridePairs = Object.entries(channelTemplates).flatMap(([type, byLocale]) => (
    byLocale && typeof byLocale === 'object'
      ? Object.keys(byLocale).map((loc) => ({ type, locale: loc }))
      : []
  ));
  const initialOverride = existingOverridePairs[0] || null;

  const [channelType, setChannelType] = useState(() => initialOverride?.type || (Array.isArray(channels) && channels[0] ? String(channels[0].type) : ''));
  const [channelLocale, setChannelLocale] = useState(initialOverride?.locale || 'default');
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const [editingOverrideKey, setEditingOverrideKey] = useState(initialOverride ? `${initialOverride.type}:${initialOverride.locale}` : '');

  const setTemplates = (next) => updateDraft({ ...draft, templates: next });
  const setBase = (content) => setTemplates({ ...templates, default: content });
  const setLocales = (nextLocales) => setTemplates({ ...templates, locales: nextLocales });
  const setChannel = (type, loc, content) => {
    const channelsMap = { ...(templates.channels || {}) };
    const perType = { ...(channelsMap[type] || {}) };
    const nextContent = content && typeof content === 'object' ? content : {};
    if (Object.values(nextContent).some((v) => typeof v === 'string' && v.trim() !== '')) {
      perType[loc] = nextContent;
      channelsMap[type] = perType;
    } else {
      delete perType[loc];
      if (Object.keys(perType).length > 0) channelsMap[type] = perType;
      else delete channelsMap[type];
    }
    setTemplates({ ...templates, channels: channelsMap });
  };
  const addChannelOverride = () => {
    if (!channelType) return;
    const current = templates.channels?.[channelType]?.[channelLocale];
    if (current && typeof current === 'object') return;
    setEditingOverrideKey(`${channelType}:${channelLocale}`);
  };
  const removeChannelOverride = () => {
    if (!channelType) return;
    setEditingOverrideKey('');
    setChannel(channelType, channelLocale, {});
  };

  const channelOptions = Array.isArray(channels) ? channels.map((c) => String(c.type)).filter(Boolean) : [];
  // Fields the selected channel declares it renders (Channel.templateFields). When present, the
  // channel-specific editor shows only these (e.g. SMS → just the body).
  const selectedChannel = Array.isArray(channels) ? channels.find((c) => String(c.type) === channelType) : null;
  const channelFields = Array.isArray(selectedChannel?.templateFields) ? selectedChannel.templateFields : null;
  // Channel-specific locale options: configured locales + translated locales + any already set on this channel.
  const localeOptionsForChannel = useMemo(() => {
    const configured = Array.isArray(locales) ? locales : [];
    const translated = Object.keys(templates.locales || {});
    const existing = channelType ? Object.keys(templates.channels?.[channelType] || {}).filter((l) => l !== 'default') : [];
    return ['default', ...Array.from(new Set([...configured, ...translated, ...existing])).filter(Boolean)];
  }, [locales, channelType, templates.locales, templates.channels]);

  const translatedCount = Object.keys(templates.locales || {}).length;
  const currentChannelOverride = channelType ? templates.channels?.[channelType]?.[channelLocale] : null;
  const hasChannelOverride = !!(currentChannelOverride && typeof currentChannelOverride === 'object');
  const isEditingNewOverride = !!channelType && editingOverrideKey === `${channelType}:${channelLocale}`;
  const showChannelOverrideEditor = hasChannelOverride || isEditingNewOverride;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Base template */}
      <section style={styles.subsection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={styles.subsectionTitle}>{t('Base template')}</h3>
            <p style={{ ...styles.help, margin: '2px 0 0' }}>{t('Language-neutral default layer (usually EN).')}</p>
          </div>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Button variant="outline" size="sm" type="button" onClick={() => setTranslationsOpen(true)}>
              🌐 {t('Translations')}{translatedCount > 0 ? ` (${translatedCount})` : ''}
            </Button>
            <VariablesHint contextKeys={contextKeys} contextPaths={contextPaths} t={t} />
          </div>
        </div>
        <TemplateFields content={templates.default || {}} onChange={setBase} t={t} contextPaths={contextPaths} />
      </section>

      {/* Channel-specific */}
      <section style={styles.subsection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={styles.subsectionTitle}>{t('Channel-specific (optional)')}</h3>
            <p style={{ ...styles.help, margin: '2px 0 0' }}>{t('Overrides are optional. Add one only when this channel needs different text or URL.')}</p>
          </div>
          {showChannelOverrideEditor && (
            <Button variant="ghost" size="sm" type="button" onClick={removeChannelOverride}>
              {t('Remove override')}
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ ...styles.field, minWidth: 200 }}>
            <Label style={styles.fieldLabel}>{t('Channel')}</Label>
            <Select value={channelType} onValueChange={setChannelType}>
              <SelectTrigger><SelectValue placeholder={t('Select channel')} /></SelectTrigger>
              <SelectContent>
                {channelOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div style={{ ...styles.field, minWidth: 160 }}>
            <Label style={styles.fieldLabel}>{t('Locale')}</Label>
            <Select value={channelLocale} onValueChange={setChannelLocale}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {localeOptionsForChannel.map((l) => <SelectItem key={l} value={l}>{l === 'default' ? t('Default') : l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {channelType && !showChannelOverrideEditor && (
            <Button variant="outline" type="button" onClick={addChannelOverride}>
              {t('Add override')}
            </Button>
          )}
        </div>
        {channelType && showChannelOverrideEditor ? (
          <TemplateFields
            content={currentChannelOverride || {}}
            onChange={(c) => setChannel(channelType, channelLocale, c)}
            t={t}
            contextPaths={contextPaths}
            fields={channelFields}
            basePlaceholder
          />
        ) : channelType ? (
          <p style={{ ...styles.help, margin: 0 }}>{t('No override for this channel and locale. The locale template is used, then the base.')}</p>
        ) : (
          <p style={styles.help}>{t('No notification channels available.')}</p>
        )}
      </section>

      <TranslationsPopup
        isOpen={translationsOpen}
        onClose={() => setTranslationsOpen(false)}
        value={templates.locales || {}}
        onChange={setLocales}
        t={t}
        locales={locales}
        defaultLocale={defaultLocale}
        contextKeys={contextKeys}
        contextPaths={contextPaths}
      />
    </div>
  );
}
