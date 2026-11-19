# Ruby Hotel guest experience frontend

React frontend for the TechyJaunt cohort project. It demonstrates the booking, payment status, booking management, concierge, and optional stretch-goal screens. It intentionally uses local demo state and sample room data; no hotel API or payment provider is connected.

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). To create a production build, run `npm run build`.

## Learn the project structure

- `src/App.jsx` contains the screens, screen navigation, and demo state. Comments beside user actions describe the matching backend responsibility.
- `src/data/rooms.js` contains temporary room data and the Naira formatter. Replace this data with the room-search API response when the backend is ready.
- `src/styles.css` contains the responsive layout, colors, and shared screen styles.
- `docs/API_CONTRACT.md` is a language-neutral starting point for agreeing API request and response shapes with the backend team.

## Demo notes

- Room availability and prices are examples; search does not query a hotel system.
- Checkout buttons simulate success and failure. They do not collect card details or charge money.
- Only a backend verified Paystack transaction may mark a booking paid.
- Guest, service, pre-arrival, and staff screen state is held in the browser and resets on reload.
- Room and hero photos and the Imprima and Inter fonts load from external URLs.
- The staff screen and access code are prototypes. Real staff authentication, identity review, and door access are outside this frontend demo.
