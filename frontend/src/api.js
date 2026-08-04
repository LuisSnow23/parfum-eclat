const BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';


const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const api = {
  get: (url) => fetch(BASE + url, { headers: getHeaders() }).then(r => {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return r.json();
  }),
  post: (url, body) => fetch(BASE + url, { 
    method: 'POST', 
    headers: getHeaders(), 
    body: JSON.stringify(body) 
  }).then(r => {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return r.json();
  }),
  put: (url, body) => fetch(BASE + url, { 
    method: 'PUT', 
    headers: getHeaders(), 
    body: JSON.stringify(body) 
  }).then(r => {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return r.json();
  }),
  delete: (url) => fetch(BASE + url, { 
    method: 'DELETE', 
    headers: getHeaders() 
  }).then(r => {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return r.json();
  }),
};

export const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
export const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';