import { DialogBoxConfig } from "../../interfaces/DialogBox";
import { getTranslatorFor } from "../i18n/translator";

/**
 * Confirmation dialog shown before cancelling a pending PaymentDocument
 * when the user is editing a basket that already has an active payment link.
 *
 * Used by Order.next() on CHECKOUT/PAYMENT → CART transitions.
 *
 * Pass the user's preferred locale (e.g. order.locale) — the builder resolves
 * it against site defaults and translates every visible string itself, per
 * docs/DialogBox.md.
 */
export function buildCancelPaymentDialog(
  preferredLocale?: string | null
): DialogBoxConfig {
  const t = getTranslatorFor(preferredLocale);

  return {
    allowClosing: false,
    type: "critical",
    title: t("Cancel pending payment?"),
    message: t(
      "You have an active payment link for this order. Editing the basket will cancel that payment. Do you want to continue?"
    ),
    optionsType: "button",
    defaultOptionId: CANCEL_PAYMENT_DIALOG_DEFAULT,
    options: [
      {
        id: CANCEL_PAYMENT_DIALOG_CONFIRM,
        label: t("Cancel payment and edit basket"),
        button: { label: t("Cancel payment and edit basket"), type: "primary" },
      },
      {
        id: CANCEL_PAYMENT_DIALOG_DEFAULT,
        label: t("Keep payment"),
        button: { label: t("Keep payment"), type: "abort" },
      },
    ],
  } as DialogBoxConfig;
}

export const CANCEL_PAYMENT_DIALOG_CONFIRM = "cancelPayment";
export const CANCEL_PAYMENT_DIALOG_DEFAULT = "keepPayment";
