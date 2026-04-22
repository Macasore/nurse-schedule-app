const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const request = async (url, options = {}) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const response = await fetch(`${API_URL}/api${url}`, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export const staffAPI = {
  getAll: () => request('/staff/'),
  create: (data) => request('/staff/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
};

export const scheduleAPI = {
  getAll: () => request('/schedule/'),
  getOne: (id) => request(`/schedule/${id}`),
  create: (data) => request('/schedule/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  generate: (data) => request('/schedule/generate', { method: 'POST', body: JSON.stringify(data) }),
  validate: (data) => request('/schedule/validate', { method: 'POST', body: JSON.stringify(data) }),
};
