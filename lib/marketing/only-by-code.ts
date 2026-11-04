import type { PromotionCodeRecord } from "../../models/PromotionCode";
import type { PromotionRecord } from "../../models/Promotion";

/** The setting that remembers the one run; absence of it is "not migrated yet". */
export const ONLY_BY_CODE_MIGRATED = "PROMOTION_ONLY_BY_CODE_MIGRATED";

export interface OnlyByCodeMigration {
  /** Promotions that were off and linked to a code: they kept working through it, and now say so. */
  movedToOnlyByCode: number;
  /** Their names, for the log: this changes how the prod behaves, and it has to be readable afterwards. */
  names: string[];
  /** Promotions that were off and linked to nothing: left alone, they gave nothing either way. */
  leftOff: number;
  /** false - the migration had run before and nothing was asked of the records. */
  ran: boolean;
}

/**
 * The one-off move of C22 (`marketing.plan.md`): `enable` used to mean "applies by itself", and a promo code applied
 * a switched-off promotion all the same. It means "works at all" now, so the records that relied on the old meaning
 * are rewritten to the new one and keep the behaviour they had:
 *
 *   off + linked to a code  ->  `{ enable: true, onlyByCode: true }`   it worked by its code only; it still does
 *   off + linked to nothing ->  left as it is                           it gave nothing then, and gives nothing now
 *   on                      ->  `onlyByCode: false` (the column's default)
 *
 * It runs once, which is remembered in the settings rather than in the schema: a promotion created later is off by
 * default in production (`PROMOTION_ENABLE_BY_DEFAULT`), and a migration running at every boot would quietly turn
 * every new one into "only by code".
 *
 * Nothing is switched on that was not working: a promotion marked `onlyByCode` does not apply by itself and is not
 * shown on the storefront. What does change is that the promotion is now visibly on - which is what it was doing.
 */
export async function migrateOnlyByCode({ force = false }: { force?: boolean } = {}): Promise<OnlyByCodeMigration> {
  if (!force && (await Settings.get(ONLY_BY_CODE_MIGRATED as any))) {
    return { movedToOnlyByCode: 0, names: [], leftOff: 0, ran: false };
  }

  const off: PromotionRecord[] = await Promotion.find!({ where: { enable: false, isDeleted: false } } as any);
  if (!off.length) {
    await remember();
    return { movedToOnlyByCode: 0, names: [], leftOff: 0, ran: true };
  }

  // Which promotions a code is linked to: the link is a collection on both sides, and the codes are few.
  const codes: PromotionCodeRecord[] = await PromotionCode.find!({} as any).populate("promotion");
  const linked = new Set<string>();
  for (const code of codes) {
    for (const promotion of Array.isArray(code.promotion) ? code.promotion : []) {
      const id = typeof promotion === "object" && promotion !== null ? (promotion as PromotionRecord).id : String(promotion);
      if (id) linked.add(String(id));
    }
  }

  const moving = off.filter((promotion) => linked.has(String(promotion.id)));
  for (const promotion of moving) {
    await Promotion.update!({ id: promotion.id } as any, { enable: true, onlyByCode: true } as any).fetch();
  }

  await remember();
  return {
    movedToOnlyByCode: moving.length,
    names: moving.map((promotion) => `${promotion.name ?? ""} [${promotion.id}]`),
    leftOff: off.length - moving.length,
    ran: true,
  };
}

async function remember(): Promise<void> {
  await Settings.set(ONLY_BY_CODE_MIGRATED as any, { value: true, type: "boolean" } as any);
}
