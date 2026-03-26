import type messages from "../../messages/en.json";

export type Messages = typeof messages;

declare global {
  // next-intl global augmentation for type-safe translation keys
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
