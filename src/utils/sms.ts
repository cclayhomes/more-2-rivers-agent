export type SmsCommand =
  | { action: 'APPROVE'; draftId: string }
  | { action: 'REJECT'; draftId: string }
  | { action: 'UNKNOWN' };

export const parseSmsCommand = (body: string): SmsCommand => {
  const cleaned = body.trim();
  const approve = cleaned.match(/^A(\d+)$/i);
  if (approve) {
    return { action: 'APPROVE', draftId: approve[1] };
  }

  const reject = cleaned.match(/^R(\d+)$/i);
  if (reject) {
    return { action: 'REJECT', draftId: reject[1] };
  }

  return { action: 'UNKNOWN' };
};
