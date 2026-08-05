const BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const handleResponse = async (response) => {
  // Si es 401 o 403, eliminar token y recargar
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    window.location.reload();
    throw new Error('Sesión expirada');
  }

  // Intentar parsear como JSON
  const text = await response.text();
  
  try {
    // Intentar parsear el texto como JSON
    const data = JSON.parse(text);
    return data;
  } catch (e) {
    // Si no es JSON, mostrar el error
    console.error('Respuesta no válida (no es JSON):', text);
    throw new Error(`Error del servidor: ${response.status}`);
  }
};

export const api = {
  get: (url) => fetch(BASE + url, { headers: getHeaders() })
    .then(handleResponse),

  post: (url, body) => fetch(BASE + url, { 
    method: 'POST', 
    headers: getHeaders(), 
    body: JSON.stringify(body) 
  }).then(handleResponse),

  put: (url, body) => fetch(BASE + url, { 
    method: 'PUT', 
    headers: getHeaders(), 
    body: JSON.stringify(body) 
  }).then(handleResponse),

  delete: (url) => fetch(BASE + url, { 
    method: 'DELETE', 
    headers: getHeaders() 
  }).then(handleResponse),
};

export const fmt = (n) => new Intl.NumberFormat('es-MX', { 
  style: 'currency', 
  currency: 'MXN', 
  minimumFractionDigits: 0, 
  maximumFractionDigits: 0 
}).format(n || 0);

export const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { 
  day: '2-digit', 
  month: 'short', 
  year: 'numeric' 
}) : '—';