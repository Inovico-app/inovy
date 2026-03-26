import type messages from "../../messages/en.json";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Record<string, unknown> {}
}

export type Messages = typeof messages;
