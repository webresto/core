import { NO_KITCHEN, ORDER_KANBAN_TOKEN, orderKanbanOptions } from "./order-kanban-rights";

/**
 * `order-kanban` became contextual (plan C1): a group that holds it as a plain tick grants no point
 * at all, and `getPermissionRights` answers with an empty list. Left alone, every operator would
 * lose the orders board on the day this is deployed.
 *
 * So each such tick becomes a grant of every point there is plus «Без кухни» — the board they had.
 * Points added later are ticked into groups by hand, exactly as for Stock Manager.
 *
 * Runs at boot, next to `ensureDefaultGroups`, and not as a schema migration: group grants live in
 * Adminizer's own model, which core reaches through its model handler and not through SQL. It is
 * idempotent — only a plain string token is converted, and a group already carrying a grant is left
 * as the administrator set it.
 */
export async function migrateOrderKanbanGrants(adminizer: any): Promise<number> {
  const groupModel = adminizer?.modelHandler?.internal("access-rights")?.get("Group");
  if (!groupModel) return 0;

  const groups = await groupModel.find({ where: {} });
  const plain = groups.filter((group: any) => Array.isArray(group.tokens) && group.tokens.includes(ORDER_KANBAN_TOKEN));
  if (!plain.length) return 0;

  const rights = (await orderKanbanOptions()).map((option) => option.id);
  // Nothing to grant and nothing to lose: a chain with no points yet keeps the plain tick, and the
  // next boot — once it has points — converts it.
  if (!rights.includes(NO_KITCHEN) || rights.length <= 1) return 0;

  for (const group of plain) {
    const tokens = group.tokens.map((token: unknown) =>
      token === ORDER_KANBAN_TOKEN ? { tokenId: ORDER_KANBAN_TOKEN, rights } : token,
    );
    await groupModel.updateOne({ where: { id: group.id } }, { tokens });
  }
  return plain.length;
}
