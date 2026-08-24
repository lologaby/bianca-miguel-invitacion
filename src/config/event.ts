import type { PrivateEvent } from '../types/invitation';

export function faqFor(event: PrivateEvent) {
  return event.faq ?? [];
}
