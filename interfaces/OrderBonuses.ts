export type OrderBonuses  = SpendBonus[];

interface SpendBonus {
  bonusProgramId: string
  bonusProgramName?: string
  amount: number
}