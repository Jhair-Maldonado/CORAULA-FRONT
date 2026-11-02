import { isAxiosError } from 'axios';

// Backend errors are {error, message, code}. A code counts only when it is a known string that
// travels with one of its contract HTTP statuses; anything else is ignored (behaviour stays HTTP-based).
export function contractErrorCode<Code extends string>(error: unknown, contractStatuses: Readonly<Record<Code, readonly number[]>>): Code | null {
  if (!isAxiosError(error) || !error.response) return null;
  const { status, data } = error.response;
  const code: unknown = data && typeof data === 'object' ? (data as Record<string, unknown>).code : undefined;
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(contractStatuses, code)) return null;
  return contractStatuses[code as Code].includes(status) ? code as Code : null;
}
