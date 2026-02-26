const ALLOWED_SENDERS = [
  'noreply@stellarmls.com',
  'reports@stellarmls.com',
  'mls@stellarmls.com',
  'stellar@stellarmatrix.com'
];

const ALLOWED_DOMAINS = ['stellarmls.com', 'stellarmatrix.com'];

const MARKET_SUBJECT_PATTERNS = [/market\s*snapshot/i, /two\s*rivers/i, /resale/i];
const LISTINGS_SUBJECT_PATTERNS = [/new\s*listings/i, /two\s*rivers/i, /resale/i];

export const isAllowedSender = (from: string): boolean => {
  const normalized = from.toLowerCase();
  const emailMatch = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!emailMatch) {
    return false;
  }

  const email = emailMatch[0];
  if (ALLOWED_SENDERS.includes(email)) {
    return true;
  }

  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
};

export const classifyEmailType = (subject: string): 'MARKET' | 'LISTINGS' | null => {
  const normalized = subject.trim();

  const isResaleListings = /resale.*active.*pending.*sold/i.test(normalized) || /resale/i.test(normalized);
  if (isResaleListings) {
    return 'LISTINGS';
  }

  const isMarket = MARKET_SUBJECT_PATTERNS.some((pattern) => pattern.test(normalized));
  if (isMarket) {
    return 'MARKET';
  }

  const isListings = LISTINGS_SUBJECT_PATTERNS.some((pattern) => pattern.test(normalized));
  if (isListings) {
    return 'LISTINGS';
  }

  return null;
};
