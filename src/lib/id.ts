import * as Crypto from 'expo-crypto';

/** Client-generated ids let records be created offline and replayed idempotently. */
export function newId(): string {
  return Crypto.randomUUID();
}
