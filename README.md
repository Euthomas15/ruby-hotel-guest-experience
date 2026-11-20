# Ruby Hotel Backend

This repository contains the Ruby Hotel backend API. It supports the guest booking and staff workflows shown in the Ruby Hotel guest experience. The frontend is separate and is not included in this repository.

## What the backend does

- Stores room types, guest bookings, staff accounts, and service requests in MongoDB.
- Stores payment records in PostgreSQL.
- Calculates booking totals on the server using room rates and 7.5% VAT.
- Starts Paystack checkout and verifies payment with Paystack before confirming a booking.
- Lets guests retrieve a booking using its reference and matching email.
- Stores guest preferences and pre-arrival details.
- Provides staff-only service-request and pre-arrival review endpoints.
- Sends booking and status emails when SMTP is configured.

Room availability is **not tracked** yet. Room search returns the room types but does not promise that rooms are available for the selected dates. Loyalty points and real door-lock integration are also not implemented; room access is only a simulated approval status.

## Requirements

- Node.js and npm versions supported by the dependencies in `backend/package.json`.
- MongoDB, reachable at the `MONGO_URI` configured in `backend/.env`.
- PostgreSQL, reachable at the `DATABASE_URL` configured in `backend/.env`.
- Paystack credentials to process real test or live transactions.
- SMTP credentials to send guest email.

The backend directory must contain a local `.env` file. It is ignored by Git; do not commit it or share its secrets.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port; defaults to `5000`. |
| `MONGO_URI` | MongoDB connection string. |
| `DATABASE_URL` | PostgreSQL connection string used for payment records. |
| `JWT_SECRET` | Secret used to sign staff login tokens. Use a random value of at least 32 characters. |
| `PAYSTACK_SECRET_KEY` | Paystack secret key used for initialization and server-side verification. |
| `PAYSTACK_CALLBACK_URL` | URL Paystack redirects the guest to after checkout. |
| `SMTP_HOST` | SMTP server hostname. |
| `SMTP_PORT` | SMTP server port, commonly `587`. |
| `SMTP_SECURE` | Set to `true` for implicit TLS, otherwise `false` (commonly used with port `587`). |
| `SMTP_USER` | SMTP account username. |
| `SMTP_PASS` | SMTP password or provider-issued app password. |
| `SMTP_FROM` | Verified sender name/address, such as `Ruby Hotel <bookings@example.com>`. |

Email delivery is disabled until all required SMTP settings are filled with valid values. Never put real passwords or keys in this README.

## Install and run

Run these commands from Git Bash:

```bash
cd backend
npm install
npm run seed:rooms
npm run dev
```

`npm run seed:rooms` inserts or updates the three room types shown on the site:

| Room | Nightly rate |
| --- | ---: |
| Standard | ₦65,000 |
| Deluxe | ₦90,000 |
| Executive | ₦120,000 |

The seed operation is safe to repeat and sets these rates again. The backend creates its PostgreSQL `payments` table and index on startup. MongoDB and PostgreSQL must both be reachable before the server starts.

## Tests

Run the unit tests from `backend`:

```bash
npm test
```

The tests cover date-only stay parsing, invalid dates, VAT calculations, the three site rates, and multiple-room totals.

## Main API groups

The API base path is `/api`.

| Group | Examples | Access |
| --- | --- | --- |
| Staff accounts | `POST /users/login`, `GET /users/me`, `POST /users/staff` | Login is for staff/admin. Staff creation requires an admin. |
| Room catalog | `GET /hotel/rooms`, `GET /hotel/rooms/:roomId` | Public reads; admin-only room changes. |
| Guest checkout and booking | `POST /hotel/checkout`, `GET /hotel/:reference?email=...` | No guest account; booking reference and email are used to identify a guest booking. |
| Paystack | `POST /hotel/:reference/payments/paystack/initialize`, `POST /hotel/:reference/payments/paystack/verify` | Checkout is initialized and verified by the backend. |
| Guest stay details | `PATCH /hotel/:reference/pre-arrival`, `PATCH /hotel/:reference/preferences`, `GET /hotel/:reference/room-access` | Booking reference and matching email required. |
| Service requests | `POST /hotel/:reference/service-requests`, `GET /hotel/:reference/service-requests?email=...` | Guest booking email required. |
| Staff operations | `GET /hotel/staff/dashboard`, `GET /hotel/staff/pre-arrivals`, `GET /hotel/staff/service-requests` | Staff/admin Bearer token required. |

See [`backend/API.md`](backend/API.md) for request body examples, status values, and the complete route list.

## Guest and payment flow

1. The guest searches rooms and requests a quote. The server calculates the total from the MongoDB room rate, stay length, room count, and VAT.
2. `POST /api/hotel/checkout` creates a pending booking in MongoDB and a payment record in PostgreSQL. The client must send a room ID, stay dates/counts, and guest name, email, and phone number; it must not supply a trusted price.
3. The guest initializes Paystack checkout. After Paystack returns, the backend verifies the transaction status, reference, amount, currency, and customer email before confirming the booking.
4. The guest can retrieve the booking and submit pre-arrival details, preferences, or service requests using the booking reference and matching email.
5. Staff use a Bearer token to review pre-arrival details, approve the simulated room-access state, and update service-request statuses.

The development-only payment simulation endpoint is unavailable when `NODE_ENV=production`.

## Staff account setup

There is no public staff registration. Create the first admin directly in MongoDB with a valid `role` of `admin` and a bcrypt-hashed password. After that, an admin can create staff accounts through `POST /api/users/staff`. Users without a staff/admin role cannot log in for staff access.

## Code map

| File | Responsibility |
| --- | --- |
| `backend/index.js` | Loads configuration, connects to both databases, mounts routes, and starts Express. |
| `backend/configs/db.js` | Connects Mongoose to MongoDB. |
| `backend/configs/postgres.js` | Creates the PostgreSQL pool and payment table/index. |
| `backend/middleware/auth.middleware.js` | Validates staff JWTs and checks staff/admin roles. |
| `backend/models/model.js` | Staff/admin account schema and password comparison. |
| `backend/models/room.model.js` | Room catalog schema. |
| `backend/models/booking.model.js` | Guest, stay, pricing, pre-arrival, preference, and simulated-access data. |
| `backend/models/service-request.model.js` | Guest service requests and their status history. |
| `backend/routes/user.routes.js` | Staff login, current-account, and admin-only staff creation routes. |
| `backend/routes/room.routes.js` | Room catalog read and admin update routes. |
| `backend/routes/booking.routes.js` | Checkout, guest booking, payment, stay, service, and staff routes. |
| `backend/controllers/controller.js` | Staff login, current account, and staff account creation logic. |
| `backend/controllers/room.controller.js` | Room search, detail, quote, creation, and update logic. |
| `backend/controllers/booking.controller.js` | Booking, payment, guest actions, staff operations, and email triggers. |
| `backend/services/pricing.service.js` | Date validation and server-side subtotal/VAT/total calculations. |
| `backend/services/email.service.js` | Configures SMTP and sends guest emails. |
| `backend/scripts/seed-rooms.js` | Seeds or refreshes the site room catalog. |
| `backend/test/pricing.service.test.js` | Unit tests for date and price calculation behavior. |
| `backend/API.md` | Detailed API request and response guide. |
| `backend/.gitignore` | Excludes the local `.env` file and `node_modules`. |

Explanatory notes for these files are kept in this README rather than added as comments throughout the code.
