import React, { useRef, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { styles, toast, notificationsApi as api, ModuleToaster } from './components/notifications/shared';

const { Button, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } = window.UIComponents;

// Inertia's own navigation, the way the panel's links move: the toaster lives in
// the shell around this page, and a full page load would take the toast with the
// page that raised it.
const { router } = window.InertiajsReact;

function MaterialIcon({ name, size = 20, style }) {
  return <span className="material-icons" style={{ fontSize: size, lineHeight: 1, ...style }}>{name}</span>;
}

/**
 * The address catalog of one city, out of a file.
 *
 * Reached from the toolbar of the `Address` list, which is where the rows are.
 * The city is asked here because this page has none of its own — the list it
 * came from shows every city at once.
 *
 * The upload creates rows and matches nothing: the same file twice makes the
 * same nodes twice. Said in the toast rather than guarded against — the list is
 * where a duplicate is seen and deleted.
 */
function AddressesUploadContent({ cities, listUrl }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  // Nothing is preselected unless there is only one city: loading a street list
  // into the wrong city is not something a default should be able to do.
  const [cityId, setCityId] = useState(() => (cities.length === 1 ? cities[0].id : ''));
  const [busy, setBusy] = useState(false);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    // Cleared before the work, so picking the same file twice in a row — the
    // usual thing after fixing it — still fires a change.
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    const { ok, payload } = await api('/core/addresses-upload', {
      method: 'POST',
      body: JSON.stringify({ city: cityId, content: await file.text() }),
    });
    setBusy(false);

    if (!ok) {
      toast('error', payload?.error || t('Could not read the file'));
      return;
    }
    toast('success', `${t('Addresses created')}: ${payload.created}`);
    // Back to the rows that were just created, which is also how the list is
    // refreshed — it being the page this started from.
    router.visit(listUrl);
  };

  return (
    <div className="absolute inset-0 overflow-auto" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div style={styles.pageShell}>
        <header>
          <h1 style={styles.sectionTitle}>{t('Addresses from a file')}</h1>
          <p style={styles.sectionDescription}>
            {t('A JSON catalog of streets, houses and places. Every node belongs to a city, so pick the one the file describes.')}
          </p>
        </header>

        <section style={{ ...styles.panel, maxWidth: 520 }}>
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('City')}</Label>
            {cities.length === 0 ? (
              <span style={styles.help}>{t('Addresses belong to a city. Create one first.')}</span>
            ) : (
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger><SelectValue placeholder={t('Pick a city')} /></SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button disabled={!cityId || busy} onClick={() => inputRef.current?.click()}>
              <MaterialIcon name="upload_file" size={16} style={{ marginRight: 6 }} />
              {busy ? t('Loading…') : t('Choose a file')}
            </Button>
            <Button variant="outline" onClick={() => router.visit(listUrl)}>
              {t('Cancel')}
            </Button>
            <input ref={inputRef} type="file" accept=".json" onChange={upload} style={{ display: 'none' }} />
          </div>

          <span style={styles.help}>
            {t('Loading the same file twice creates the same nodes twice — this is not a synchronisation.')}
          </span>
        </section>
      </div>
    </div>
  );
}

export default function AddressesUpload(props) {
  return (
    <I18nProvider initialLocale={props?.locale || 'en'} messages={props?.messages}>
      <ModuleToaster />
      <AddressesUploadContent
        cities={Array.isArray(props?.cities) ? props.cities : []}
        listUrl={props?.listUrl || ''}
      />
    </I18nProvider>
  );
}
