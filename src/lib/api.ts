const API_URL = 'http://localhost:3000/api/v1';

export async function checkBackend() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error('Backend request failed');
  }

  return response.json();
}