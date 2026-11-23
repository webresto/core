import React, { useCallback } from 'react';
import TagsEditor from '../components/TagsEditor';
import { useAdminTranslation } from '../i18n/admin-messages';

function TagsEditorControl({ initialValue, onChange }) {
  const t = useAdminTranslation();

  // adminizer's jsonEditor field reads the new value from `event.json`.
  const handleChange = useCallback(
    (tags) => {
      if (typeof onChange === 'function') onChange({ json: tags });
    },
    [onChange],
  );

  if (!t) return null;
  return <TagsEditor value={initialValue} onChange={handleChange} t={t} />;
}

export default TagsEditorControl;
