import React, { useCallback } from 'react';
import WorktimeEditor from '../components/WorktimeEditor';
import { useAdminTranslation } from '../i18n/admin-messages';

function WorktimeViewer({ initialValue, onChange }) {
  const t = useAdminTranslation();

  // The adminizer jsonEditor field reads the new value from `event.json`, so
  // wrap the editor's plain WorkTime[] output to match that contract.
  const handleChange = useCallback(
    (worktime) => {
      if (typeof onChange === 'function') onChange({ json: worktime });
    },
    [onChange],
  );

  if (!t) return null;
  return <WorktimeEditor value={initialValue} onChange={handleChange} t={t} />;
}

export default WorktimeViewer;
