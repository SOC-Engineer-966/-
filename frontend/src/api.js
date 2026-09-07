// Dynamic API base URL: works locally, on LAN IP, or when served from backend
const isDev = import.meta.env.DEV;
export const API_BASE = isDev 
  ? `http://${window.location.hostname}:5000/api` 
  : '/api';

export const CURRENCY = 'ر.س';

export function getActiveStoreSlug() {
  if (typeof window === 'undefined') return 'default';
  const urlParam = new URLSearchParams(window.location.search).get('store');
  if (urlParam) {
    const clean = urlParam.toLowerCase().trim();
    localStorage.setItem('al_muhasib_store', clean);
    return clean;
  }
  return localStorage.getItem('al_muhasib_store') || 'default';
}

export function setActiveStoreSlug(slug) {
  if (!slug || slug === 'default') {
    localStorage.removeItem('al_muhasib_store');
  } else {
    localStorage.setItem('al_muhasib_store', slug.toLowerCase().trim());
  }
}

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-store-slug': getActiveStoreSlug(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    const error = new Error(data.error || 'حدث خطأ أثناء معالجة الطلب');
    if (data.is_suspended || response.status === 403) {
      error.isSuspended = true;
    }
    throw error;
  }
  return data;
}

export function formatMoney(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + CURRENCY;
}

export function formatNumber(num) {
  return (Number(num) || 0).toLocaleString('ar-SA');
}
