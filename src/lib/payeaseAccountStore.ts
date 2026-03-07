export type ServiceId = string;

export type SubscriptionRecord = {
  id: ServiceId;
  name: string;
  account: string;
  price: string;
  status: string;
  started: string;
  renewal: string;
  method: string;
};

export type HistoryRecord = {
  id: string;
  title: string;
  date: string;
  amount: string;
  status: string;
  serviceId: ServiceId;
};

export type AccountData = {
  account: string;
  subscriptions: SubscriptionRecord[];
  history: HistoryRecord[];
};

const SESSION_EMAIL_KEY = 'payease_account_email';
const SESSION_TOKEN_KEY = 'payease_access_token';

const normalizeEmail = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

export const getSessionIdentity = (search?: { get: (name: string) => string | null }) => {
  const searchEmail = normalizeEmail(search?.get('account') ?? null);
  const authMethod = search?.get('auth') ?? '';

  const storedEmail =
    typeof window === 'undefined' ? '' : normalizeEmail(localStorage.getItem(SESSION_EMAIL_KEY));

  return {
    email: searchEmail || storedEmail || '',
    authMethod,
  };
};

export const persistSessionIdentity = (email: string, token: string) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.setItem(SESSION_EMAIL_KEY, normalized);
  localStorage.setItem(SESSION_TOKEN_KEY, token);
};

export const clearSessionIdentity = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_EMAIL_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
};

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
};
