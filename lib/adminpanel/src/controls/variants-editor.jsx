import React, { useCallback } from 'react';
import VariantsEditor from '../components/VariantsEditor';
import { useAdminTranslation } from '../i18n/admin-messages';

function VariantsEditorControl({ initialValue, onChange }) {
  const t = useAdminTranslation();

  // adminizer's jsonEditor field reads the new value from `event.json`.
  const handleChange = useCallback(
    (variants) => {
      if (typeof onChange === 'function') onChange({ json: variants });
    },
    [onChange],
  );

  if (!t) return null;
  return <VariantsEditor value={initialValue} onChange={handleChange} t={t} />;
}

export default VariantsEditorControl;
