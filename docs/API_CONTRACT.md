# Frontend / backend handoff

This is a proposed, language-neutral contract to help the team agree on the boundary between React and the backend. Paths and fields are suggestions; agree on them together before implementation. The backend can use any language or framework.

## Guest journey

| Frontend action | Suggested backend operation | Expected result |
| --- | --- | --- |
| Search dates, guests, and rooms | `GET /api/rooms?checkIn=&checkOut=&guests=` | Available rooms with ID, name, description, features, image URL, nightly price, and currency |
| Continue after guest details | `POST /api/bookings` | Pending booking ID/reference, stay details, itemized price, and payment state |
| Start Paystack checkout | `POST /api/payments/paystack/initialize` with booking ID | Hosted checkout URL and provider reference; keep secret keys on the server |
| Return from checkout / refresh status | `GET /api/payments/{providerReference}/verify` | Server-verified payment state and booking state |
| Find a booking | `POST /api/bookings/lookup` with reference and email | Booking details only after server validates the lookup credentials |
| Submit a concierge request | `POST /api/bookings/{bookingId}/requests` | Request ID, category, creation time, and initial `Received` state |
| Track requests | `GET /api/bookings/{bookingId}/requests` | Requests and current service statuses |

## Optional stretch goals

| Frontend action | Suggested backend operation | Important rule |
| --- | --- | --- |
| Submit pre-arrival details | `POST /api/bookings/{bookingId}/pre-arrival` | Booking remains confirmed; staff reviews arrival details |
| Show room access state | `GET /api/bookings/{bookingId}/access` | Do not show access until staff approval; the current screen is only a simulation |
| Save guest preference | `PUT /api/bookings/{bookingId}/preference` | Return curated suggestions; this sprint does not require machine learning |
| Show points | `GET /api/bookings/{bookingId}/rewards` | Example balance only in this frontend; no redemption or loyalty program is implemented |

## Staff operations

- `GET /api/staff/requests` returns the staff request queue.
- `PATCH /api/staff/requests/{requestId}/status` changes a request to `In progress` or `Completed`.
- `PATCH /api/staff/bookings/{bookingId}/check-in` records an authorized approval decision.
- Protect all staff endpoints with server-side staff authentication and authorization. Record who changed a status and when.

## Shared rules to agree on

- Use one consistent date format (ISO `YYYY-MM-DD`) and an explicit hotel timezone.
- Return money as integer minor units or integer Naira plus an explicit currency. Confirm the VAT rule and rounding on the server.
- Suggested booking states: `pending_payment`, `confirmed`, `cancelled`.
- Suggested payment states: `pending`, `verified`, `failed`.
- Suggested service states: `received`, `in_progress`, `completed`.
- The frontend must never decide that payment succeeded from a redirect query string. The backend verifies Paystack and returns the trusted state.
- Do not put payment provider secret keys or staff authorization logic in React.

These requests are not implemented yet. The current screens simulate responses locally so the frontend can be reviewed before a backend language or framework is selected.
