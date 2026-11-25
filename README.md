# Ruby Hotel guest experience frontend

React frontend for the TechyJaunt cohort project. The core booking journey calls the API in `backend`; pre-arrival, room access, recommendations, and staff screens still contain demo behavior.

## Run locally

Open two terminals from the repository root. Start the backend in one terminal using `backend/README.md`. In the other, run:

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). To create a production build, run `npm run build`.

## Learn the project structure

- `frontend/src/App.jsx` contains the screens and beginner-friendly flow comments. Core room search, booking, payment verification, booking lookup, and guest service requests call the backend.
- `frontend/src/services/api.js` keeps HTTP requests in one place so the React screens don't need to know fetch details.
- `frontend/src/data/rooms.js` provides display fallbacks and the Naira formatter. API prices are stored in kobo and converted for display.
- `frontend/src/styles.css` contains the responsive layout, colors, and shared screen styles.
- `backend/docs/API_DOCUMENTATION.md` lists the backend routes this frontend uses.

## Demo notes

- The API address defaults to `http://localhost:5000/api` and can be changed in `frontend/.env.local` using `VITE_API_BASE_URL`.
- Before production deployment, set `VITE_API_BASE_URL` to the deployed backend API URL. The backend team must allow the Vercel site in CORS and set `PAYSTACK_CALLBACK_URL` to the frontend `/payment/callback` address.
- Paystack is hosted by Paystack. Only the backend's transaction verification response may mark a booking paid.
- Pre-arrival, room-access, recommendations, and staff views remain prototypes until their APIs and authentication are agreed.
- Room and hero photos and the Imprima and Inter fonts load from external URLs.
- The staff screen and access code are prototypes. Real staff authentication, identity review, and door access are outside this frontend demo.
