# Ruby Hotel API

Base URL: `/api`

MongoDB stores room catalog, guest bookings, service requests, and staff accounts. PostgreSQL stores payment records.

## Rooms and pricing

- `GET /hotel/rooms?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2`
- `GET /hotel/rooms/:roomId?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&roomCount=1`

Room IDs can be MongoDB IDs or the seeded slugs `standard`, `deluxe`, and `executive`. The room list returns `availabilityTracked: false`; inventory is not known or enforced. Quotes are calculated by the backend from the room's nightly NGN rate, stay length, and room count. The current VAT rate is 7.5%.

Seed or refresh the site's room catalog from the `backend` directory:

```bash
npm run seed:rooms
```

## Guest booking

### Create a booking

`POST /hotel/checkout`

```json
{
  "guest": {
    "fullName": "Guest Name",
    "email": "guest@example.com",
    "phoneNumber": "+2347000000000"
  },
  "roomId": "standard",
  "stay": {
    "checkIn": "2026-11-20",
    "checkOut": "2026-11-22",
    "guestCount": 2,
    "roomCount": 1
  }
}
```

The server loads the rate from MongoDB and returns the subtotal, VAT, total, booking reference, and `availabilityTracked: false`. Do not send a trusted amount from the browser.

### Retrieve a booking

- `GET /hotel/:reference?email=guest@example.com`
- `PATCH /hotel/:reference/pre-arrival` with `email`, `arrivalTime`, `contactNumber`, and optional `specialRequests`
- `PATCH /hotel/:reference/preferences` with `email` and one of `quiet_stay`, `explore_abuja`, or `fitness_wellness`
- `GET /hotel/:reference/room-access?email=guest@example.com`
- `POST /hotel/:reference/service-requests` with `email`, a category (`Extra towels`, `Room cleaning`, `Airport pickup`, or `Food and drinks`), and optional `details`
- `GET /hotel/:reference/service-requests?email=guest@example.com`

Guest booking actions require both the booking reference and matching email. Room access is only a simulated approval state; it does not expose a lock code or control a real lock.

## Payments

- `POST /hotel/:reference/payments/paystack/initialize`
- `POST /hotel/:reference/payments/paystack/verify`
- `GET /hotel/payments/paystack/callback?reference=RUB-123456`

Both POST requests require `{ "email": "guest@example.com" }` to match the booking. The client should redirect to the returned `authorizationUrl`. The backend verifies the transaction with Paystack and checks its status, reference, amount, currency, and customer email before confirming a booking. PostgreSQL records payment state. `POST /hotel/:reference/payments/simulate` is available only outside production for local testing and also requires the matching email.

## Staff

Staff requests use `Authorization: Bearer <token>`. Obtain a token with `POST /users/login`. Staff account creation (`POST /users/staff`) is admin-only; create the first admin directly in MongoDB.

- `GET /hotel/staff/dashboard`
- `GET /hotel/staff/pre-arrivals`
- `PATCH /hotel/staff/bookings/:reference/pre-arrival` with `{ "status": "approved" }` or `{ "status": "rejected" }`
- `GET /hotel/staff/service-requests`
- `PATCH /hotel/staff/service-requests/:id/status` with `requested`, `in_progress`, `completed`, or `cancelled`
- `POST /users/staff` (admin only)

Approving a paid booking's submitted pre-arrival details enables its simulated room-access state. Loyalty points and real door-lock integration are not implemented.

## Email

Confirmation and booking-update messages use SMTP. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. When SMTP is not configured, API responses report `emailDelivery.status: "not_configured"`.
