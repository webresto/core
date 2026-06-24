export interface DefaultAdminGroup {
  name: string;
  description: string;
  tokens: string[];
  ensureTokens?: string[];
}

/**
 * Creates configured groups only when a group with the same name does not exist.
 * Existing groups are left untouched unless ensureTokens explicitly lists new
 * tokens that should be added without changing other fields or memberships.
 */
export async function ensureDefaultGroups(
  adminizer: any,
  defaultGroups: DefaultAdminGroup[] | undefined,
): Promise<void> {
  if (!Array.isArray(defaultGroups) || defaultGroups.length === 0) return;

  const groupModel = adminizer.modelHandler.model.get('GroupAP');

  for (const defaultGroup of defaultGroups) {
    const existingGroup = await groupModel._findOne({
      name: defaultGroup.name,
    });

    if (existingGroup) {
      const ensureTokens = Array.isArray(defaultGroup.ensureTokens) ? defaultGroup.ensureTokens : [];
      const currentTokens = Array.isArray(existingGroup.tokens) ? existingGroup.tokens : [];
      const missingTokens = ensureTokens.filter((token) => !currentTokens.includes(token));

      if (missingTokens.length > 0) {
        await groupModel._updateOne(
          { name: defaultGroup.name },
          { tokens: [...currentTokens, ...missingTokens] },
        );
      }
      continue;
    }

    await groupModel._create({
      name: defaultGroup.name,
      description: defaultGroup.description,
      tokens: [...defaultGroup.tokens],
    });
  }
}
