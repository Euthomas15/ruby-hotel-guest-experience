// Every browser request goes through this small helper so API errors are
// handled consistently and the backend address can change without code edits.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(`Cannot reach the backend at ${API_BASE_URL}. Check that its server is running.`);
  }

  // The backend sends JSON with a "data" property for successful responses.
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `The backend returned an error (${response.status}).`);
  }

  return result.data;
}

// Available room records come from the backend database, not the demo room list.
export function getAvailableRooms({ checkIn, checkOut, guests }) {
  const query = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
  return request(`/rooms?${query}`);
}

// The backend creates the pending booking and calculates the authoritative total.
export function createBooking(details) {
  return request('/bookings', { method: 'POST', body: details });
}

// Paystack secrets stay on the backend; the frontend only receives a hosted URL.
export function initializePaystack(bookingId) {
  return request('/payments/paystack/initialize', {
    method: 'POST',
    body: { bookingId },
  });
}

// The backend checks the reference with Paystack and returns trusted payment state.
export function verifyPaystack(reference) {
  return request(`/payments/${encodeURIComponent(reference)}/verify`);
}

// Looking up the booking returns both the booking data and a short-lived guest token.
export function findBooking({ bookingReference, email }) {
  return request('/bookings/lookup', {
    method: 'POST',
    body: { bookingReference, email },
  });
}

export function createServiceRequest(bookingId, guestToken, requestDetails) {
  return request(`/bookings/${encodeURIComponent(bookingId)}/requests`, {
    method: 'POST',
    body: requestDetails,
    token: guestToken,
  });
}

export function getServiceRequests(bookingId, guestToken) {
  return request(`/bookings/${encodeURIComponent(bookingId)}/requests`, {
    token: guestToken,
  });
}
