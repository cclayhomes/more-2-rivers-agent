import crypto from 'crypto';

export const hashText = (value: string) =>
  crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
