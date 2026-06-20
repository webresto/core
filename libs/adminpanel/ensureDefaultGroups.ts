export interface DefaultAdminGroup {
  name: string;
  description: string;
  tokens: string[];
}

/**
 * Creates configured groups only when a group with the same name does not exist.
 * Existing groups are intentionally left untouched, including their tokens and users.
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

    if (existingGroup) continue;

    await groupModel._create({
      name: defaultGroup.name,
      description: defaultGroup.description,
      tokens: [...defaultGroup.tokens],
    });
  }
}
