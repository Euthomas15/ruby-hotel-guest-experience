# Ruby Hotel Guest Experience API

Base URL:
http://localhost:5000/api

## 1. Rooms

### Get Available Rooms
GET /rooms

Query parameters:
- checkIn
- checkOut
- guests

## 2. Bookings

### Create Booking
POST /bookings

Required fields:
- roomId
- guestName
- guestEmail
- guestPhone
- checkIn
- checkOut
- guests

### Look Up Booking
POST /bookings/lookup

Required fields:
- bookingReference
- email

### Create Service Request
POST /bookings/:bookingId/requests

Required fields:
- category
- description

### Get Service Requests
GET /bookings/:bookingId/requests

## 3. Payments

### Initialize Paystack Payment
POST /payments/paystack/initialize

Required field:
- bookingId

### Verify Payment
GET /payments/:providerReference/verify

### Paystack Webhook
POST /payments/paystack/webhook

## 4. Staff

### Staff Login
POST /staff/login

Required fields:
- email
- password

### Update Service Request Status
PATCH /staff/requests/:requestId/status

Required field:
- status

Authentication:
Bearer JWT token required.