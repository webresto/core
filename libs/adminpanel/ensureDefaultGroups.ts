export interface DefaultAdminGroup {
  name: string;
  description: string;
  tokens: string[];
  ensureTokens?: string[];
  removeTokens?: string[];
}

/**
 * Creates configured groups only when a group with the same name does not exist.
 * Existing groups are left untouched unless ensureTokens explicitly lists new
 * tokens to add or removeTokens explicitly lists tokens to revoke.
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
      const removeTokens = Array.isArray(defaultGroup.removeTokens) ? defaultGroup.removeTokens : [];
      const retainedTokens = currentTokens.filter((token: string) => !removeTokens.includes(token));
      const missingTokens = ensureTokens.filter((token: string) => !retainedTokens.includes(token));

      if (missingTokens.length > 0 || retainedTokens.length !== currentTokens.length) {
        await groupModel._updateOne(
          { name: defaultGroup.name },
          { tokens: [...retainedTokens, ...missingTokens] },
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
