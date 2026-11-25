import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown,
  Clock3, ConciergeBell, DoorOpen, MapPin, Menu, ShieldCheck,
  Sparkles, Wifi,
} from 'lucide-react';
import { formatNaira, rooms } from './data/rooms.js';
import { createBooking, createServiceRequest, findBooking, getAvailableRooms, getServiceRequests, initializePaystack, verifyPaystack } from './services/api.js';

const DEMO_REFERENCE = 'RUB-260112';
const VAT_RATE = 0.075;

// Keep the top navigation deliberately simple: each button opens one screen.
// A production app should use URLs (React Router or a similar router) so links can be shared.
function Header({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const goTo = (screen) => { setMenuOpen(false); onNavigate(screen); };
  return (
    <header className="site-header">
      <button className="brand brand-button" onClick={() => goTo('search')} aria-label="Ruby Hotel home">Ruby<span>Hotel</span><i>.</i></button>
      <nav className="desktop-nav" aria-label="Main navigation">
        <button onClick={() => goTo('search')}>Rooms &amp; suites</button>
        <button onClick={() => goTo('lookup')}>My booking</button>
        <button onClick={() => goTo('concierge')}>Concierge</button>
      </nav>
      <span className="header-location"><MapPin size={15} /> Abuja, Nigeria</span>
      <button className="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={22} /></button>
      {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation"><button onClick={() => goTo('search')}>Rooms &amp; suites</button><button onClick={() => goTo('lookup')}>My booking</button><button onClick={() => goTo('concierge')}>Concierge</button></nav>}
    </header>
  );
}

function Footer({ onNavigate }) {
  return (
    <footer className="site-footer">
      <span className="brand">Ruby<span>Hotel</span><i>.</i></span>
      <p>Guest experience demo - sample data only</p>
      <button onClick={() => onNavigate('staff')}>Staff demo view</button>
    </footer>
  );
}

function PageTitle({ eyebrow, title, children }) {
  return <div className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="page-subtitle">{children}</p>}</div>;
}

function BackButton({ onClick, children = 'Back' }) {
  return <button className="text-button back-button" onClick={onClick}><ArrowLeft size={15} /> {children}</button>;
}

function Panel({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function StayCard({ room, checkIn, checkOut, guests, nights, total, compact = false }) {
  return (
    <Panel className={`stay-card ${compact ? 'stay-card-compact' : ''}`}>
      <p className="eyebrow">YOUR STAY</p>
      {room && <img className="stay-image" src={room.image} alt={room.imageAlt} />}
      <h3>{room?.name || 'Choose a room'}</h3>
      <p>{checkIn} - {checkOut} · {nights} {nights === 1 ? 'night' : 'nights'}</p>
      <p>1 room · {guests} {guests === 1 ? 'guest' : 'guests'}</p>
      {total != null && <div className="stay-total"><span>Stay total</span><strong>{formatNaira(total)}</strong></div>}
    </Panel>
  );
}

function RoomCard({ room, nights, onChoose }) {
  return (
    <article className="room-card">
      <div className="room-photo-wrap"><img className="room-photo" src={room.image} alt={room.imageAlt} /><span className="photo-label"><Sparkles size={13} /> Thoughtful comfort</span></div>
      <div className="room-card-content">
        <div className="room-title-row"><div><p className="eyebrow">RUBY HOTEL · ABUJA</p><h3>{room.name}</h3></div><span className="room-rating">★ <span>4.9</span></span></div>
        <p className="room-description">{room.description}</p>
        <div className="feature-list">{room.features.map((feature) => <span key={feature}>{feature}</span>)}</div>
        <div className="room-card-bottom"><div className="price"><strong>{formatNaira(room.pricePerNight)}</strong><span> / night</span><small>{formatNaira(room.pricePerNight * nights)} before VAT · {nights} nights</small></div><button className="button button-outline" onClick={() => onChoose(room)}>View room <ArrowRight size={15} /></button></div>
      </div>
    </article>
  );
}

function BookingSearch({ value, onChange, onSearch }) {
  return (
    <form className="search-form" onSubmit={onSearch}>
      <label className="field"><span>Check-in</span><span className="input-line"><CalendarDays size={16} /><input aria-label="Check-in date" type="date" value={value.checkIn} onChange={(event) => onChange('checkIn', event.target.value)} required /></span></label>
      <label className="field"><span>Check-out</span><span className="input-line"><CalendarDays size={16} /><input aria-label="Check-out date" type="date" value={value.checkOut} onChange={(event) => onChange('checkOut', event.target.value)} required /></span></label>
      <label className="field"><span>Guests</span><span className="input-line"><select aria-label="Number of guests" value={value.guests} onChange={(event) => onChange('guests', Number(event.target.value))}><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option></select><ChevronDown size={15} /></span></label>
      <button className="button button-primary search-button" type="submit">Search rooms <ArrowRight size={15} /></button>
    </form>
  );
}

export default function App() {
  const [page, setPage] = useState('search');
  const [stay, setStay] = useState({ checkIn: '2026-11-27', checkOut: '2026-11-29', guests: 2 });
  const [room, setRoom] = useState(null);
  const [guest, setGuest] = useState({ name: '', email: '', phone: '' });
  const [bookingReference, setBookingReference] = useState(DEMO_REFERENCE);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentState, setPaymentState] = useState('not_started');
  const [requests, setRequests] = useState([]);
  const [service, setService] = useState('Extra towels');
  const [serviceNote, setServiceNote] = useState('');
  const [arrival, setArrival] = useState({ time: '3:00 pm', note: '', phone: '' });
  const [arrivalSubmitted, setArrivalSubmitted] = useState(false);
  const [checkInApproved, setCheckInApproved] = useState(false);
  const [preference, setPreference] = useState('Quiet stay · Relaxation');
  const [availableRooms, setAvailableRooms] = useState(rooms);
  const [booking, setBooking] = useState(null);
  const [guestAccessToken, setGuestAccessToken] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [busy, setBusy] = useState(false);

  // This is shared screen state for the demo. A reload starts fresh; a backend
  // will become the source of truth for real bookings, payment, and requests.
  const nights = useMemo(() => {
    const days = (new Date(`${stay.checkOut}T00:00:00`) - new Date(`${stay.checkIn}T00:00:00`)) / 86400000;
    return Math.max(1, Number.isFinite(days) ? days : 1);
  }, [stay.checkIn, stay.checkOut]);
  const subtotal = room ? room.pricePerNight * nights : 0;
  const vat = Math.round(subtotal * VAT_RATE);
  // The API stores prices in kobo; the visual demo data is already in naira.
  const total = booking ? booking.totalAmount / 100 : subtotal + vat;

  // Paystack returns the guest here after checkout. Verify the reference with
  // our backend; never trust the browser redirect itself as proof of payment.
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!reference) return;
    const saved = sessionStorage.getItem('ruby-checkout');
    if (saved) {
      const checkout = JSON.parse(saved);
      setBooking(checkout.booking);
      setRoom(checkout.room);
      setGuest(checkout.guest);
      setStay(checkout.stay);
      setBookingReference(checkout.booking.bookingReference);
    }
    setPaymentReference(reference);
    setPage('verifying');
    verifyPaystack(reference).then((result) => {
      setPaymentState(result.payment?.status === 'verified' ? 'paid' : 'failed');
      setBooking(result.booking || null);
      setPage(result.payment?.status === 'verified' && result.booking?.status === 'confirmed' ? 'confirmed' : 'failed');
      sessionStorage.removeItem('ruby-checkout');
    }).catch((error) => {
      setNotice(error.message);
      setPage('verifying');
    });
  }, []);

  function updateStay(field, fieldValue) {
    setStay((current) => ({ ...current, [field]: fieldValue }));
    setNotice('');
  }

  async function searchRooms(event) {
    event.preventDefault();
    if (stay.checkOut <= stay.checkIn) {
      setNotice('Check-out must be after check-in. Please choose new dates.');
      return;
    }
    setNotice('');
    setBusy(true);
    try {
      // Convert API room records into the same shape the existing room cards use.
      const result = await getAvailableRooms(stay);
      setAvailableRooms(result.map((item) => ({ ...item, image: item.imageUrl || '/images/standardroom.jpg', imageAlt: item.imageAlt || item.name, pricePerNight: item.pricePerNight / 100, features: item.features || [] })));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
    setPage('search');
    document.getElementById('rooms-list')?.scrollIntoView({ behavior: 'smooth' });
  }

  function startBooking(chosenRoom) {
    setRoom(chosenRoom);
    setNotice('');
    setPage('room');
  }

  function continueToGuestDetails() {
    setPage('guest');
  }

  async function submitGuestDetails(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const created = await createBooking({ roomId: room.id, guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone, checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests });
      setBooking(created);
      setBookingReference(created.bookingReference);
      setPaymentState('pending');
      setPage('payment');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDemoCheckout() {
    if (!booking?.id) { setNotice('Create the booking first, then continue to Paystack.'); return; }
    setBusy(true);
    setNotice('');
    try {
      const payment = await initializePaystack(booking.id);
      setPaymentReference(payment.paymentReference);
      // Keep the guest context while Paystack temporarily takes over the browser.
      sessionStorage.setItem('ruby-checkout', JSON.stringify({ booking, room, guest, stay }));
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function simulatePayment(result) {
    // Demo only. Real success/failure comes from the server verifying Paystack.
    setPaymentState(result === 'failed' ? 'failed' : 'pending');
    setPage(result === 'failed' ? 'failed' : 'verifying');
  }

  async function confirmPayment() {
    if (!paymentReference) { setNotice('No payment reference is available to verify.'); return; }
    setBusy(true);
    try {
      const result = await verifyPaystack(paymentReference);
      const paid = result.payment?.status === 'verified' && result.booking?.status === 'confirmed';
      setBooking(result.booking || booking);
      setPaymentState(paid ? 'paid' : 'failed');
      setPage(paid ? 'confirmed' : 'failed');
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function lookupBooking(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await findBooking({ bookingReference, email: lookupEmail });
      const found = result.booking;
      setBooking(found); setGuestAccessToken(result.guestAccessToken); setBookingReference(found.bookingReference);
      setGuest({ name: found.guestName, email: found.guestEmail, phone: found.guestPhone || '' });
      setStay({ checkIn: String(found.checkIn).slice(0, 10), checkOut: String(found.checkOut).slice(0, 10), guests: found.guests });
      if (found.room) setRoom({ ...found.room, id: found.roomId, image: found.room.imageUrl || '/images/standardroom.jpg', imageAlt: found.room.imageAlt || found.room.name, pricePerNight: found.nightlyRate / 100, features: found.room.features || [] });
      setPaymentState(found.status === 'confirmed' ? 'paid' : 'pending');
      setLookupMessage('Booking found.'); setPage('booking');
    } catch (error) { setLookupMessage(error.message); }
    finally { setBusy(false); }
  }

  async function submitService(event) {
    event.preventDefault();
    if (!booking?.id || !guestAccessToken) { setNotice('Look up your booking with its reference and email before requesting a service.'); return; }
    const description = serviceNote.trim() || `Please arrange: ${service}`;
    setBusy(true);
    try {
      const created = await createServiceRequest(booking.id, guestAccessToken, { category: service, description });
      setRequests((current) => [{ id: created.id, service: created.category || service, note: created.description || description, status: created.status || 'received', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }, ...current]);
      setServiceNote(''); setPage('tracking');
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function refreshRequests() {
    if (!booking?.id || !guestAccessToken) return;
    try {
      const result = await getServiceRequests(booking.id, guestAccessToken);
      setRequests(result.map((item) => ({ id: item.id, service: item.category, note: item.description, status: item.status === 'in_progress' ? 'In progress' : item.status === 'completed' ? 'Completed' : 'Received', time: new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })));
    } catch (error) { setNotice(error.message); }
  }

  function updateRequestStatus(requestId, nextStatus) {
    // Backend: staff-only PATCH /api/staff/requests/{requestId}/status.
    setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: nextStatus } : request));
  }

  function setGuestField(field, fieldValue) {
    setGuest((current) => ({ ...current, [field]: fieldValue }));
  }

  const bookingActions = <div className="button-stack"><button className="button button-primary" onClick={() => setPage('arrival')}>Pre-arrival details <ArrowRight size={15} /></button><button className="button button-outline" onClick={() => setPage('access')}>Room access demo <DoorOpen size={15} /></button><button className="button button-outline" onClick={() => setPage('recommendations')}>Your preferences <Sparkles size={15} /></button><button className="button button-outline" onClick={() => setPage('concierge')}>Request a service <ConciergeBell size={15} /></button></div>;

  return (
    <div className="page-shell">
      <Header onNavigate={(next) => { setNotice(''); setPage(next); if (next === 'tracking') refreshRequests(); }} />
      <main className="app-main">
        {notice && page !== 'search' && <p className="form-message" role="alert">{notice}</p>}
        {page === 'search' && <>
          <section className="hero" aria-labelledby="hero-title"><div className="hero-image" role="img" aria-label="A peaceful hotel setting at sunset" /><div className="hero-shade" /><div className="hero-copy"><span className="hero-kicker">A WARM WELCOME TO ABUJA</span><h1 id="hero-title">Your perfect stay,<br />without the wait.</h1><p>Thoughtful comfort, right where you need it.</p></div><div className="hero-caption">A quieter kind of city escape</div></section>
          <section className="search-panel" aria-label="Find available rooms"><div className="search-heading"><div><p className="eyebrow">PLAN YOUR STAY</p><h2>When can we welcome you?</h2></div><span className="search-note"><Wifi size={15} /> Free Wi-Fi in every room</span></div><BookingSearch value={stay} onChange={updateStay} onSearch={searchRooms} />{notice && <p className="form-message" role="alert">{notice}</p>}</section>
          <section className="rooms-section" id="rooms-list"><div className="section-heading"><div><p className="eyebrow">MADE FOR YOUR KIND OF REST</p><h2>Find a room to love</h2><p className="section-intro">Explore spaces designed to make every moment feel easy.</p></div><span className="room-count">{String(availableRooms.length).padStart(2, '0')} <span>ROOM TYPES</span></span></div>{notice && <p className="form-message" role="alert">{notice}</p>}<div className="room-grid">{availableRooms.map((item) => <RoomCard key={item.id} room={item} nights={nights} onChoose={startBooking} />)}</div><p className="rate-note">Room availability and rates are returned by the hotel backend.</p></section>
        </>}

        {page === 'room' && <><BackButton onClick={() => setPage('search')}>Back to rooms</BackButton><PageTitle eyebrow="02 / 09 · ROOM DETAILS" title="Make yourself at home.">Choose a room for {stay.checkIn} to {stay.checkOut}.</PageTitle><div className="content-grid"><div><img className="detail-image" src={room?.image} alt={room?.imageAlt} /><Panel><p className="eyebrow">ABOUT THE ROOM</p><h2>{room?.name}</h2><p>{room?.description} Your stay includes Wi-Fi, air conditioning and access to the gym.</p><div className="feature-list">{room?.features.map((feature) => <span key={feature}>{feature}</span>)}</div></Panel><Panel><h3>Your dates</h3><p>{stay.checkIn} → {stay.checkOut} · {nights} nights · {stay.guests} guests</p><button className="text-button" onClick={() => setPage('search')}>Change dates</button></Panel></div><aside><StayCard room={room} checkIn={stay.checkIn} checkOut={stay.checkOut} guests={stay.guests} nights={nights} total={total} /><div className="button-stack"><button className="button button-primary" onClick={continueToGuestDetails}>Continue with this room <ArrowRight size={15} /></button><p className="fine-print">No payment is taken until checkout. Example rates for this demo.</p></div></aside></div></>}

        {page === 'guest' && <><BackButton onClick={() => setPage('room')}>Back to room details</BackButton><PageTitle eyebrow="03 / 09 · GUEST DETAILS" title="A few details. Then you're set.">Book as a guest. No account needed.</PageTitle><div className="content-grid"><form className="form-panel" onSubmit={submitGuestDetails}><label className="field"><span>Full name</span><input autoComplete="name" value={guest.name} onChange={(event) => setGuestField('name', event.target.value)} required placeholder="Your full name" /></label><label className="field"><span>Email address</span><input type="email" autoComplete="email" value={guest.email} onChange={(event) => setGuestField('email', event.target.value)} required placeholder="you@example.com" /></label><label className="field"><span>Phone number</span><input type="tel" autoComplete="tel" value={guest.phone} onChange={(event) => setGuestField('phone', event.target.value)} required placeholder="+234 800 000 0000" /></label><p className="fine-print">Booking updates and your confirmation will be sent to this email.</p><button className="button button-primary full-width" type="submit">Continue to payment <ArrowRight size={15} /></button><p className="fine-print">By continuing, you agree to the hotel's booking terms and privacy policy.</p></form><aside><StayCard room={room} checkIn={stay.checkIn} checkOut={stay.checkOut} guests={stay.guests} nights={nights} total={total} /></aside></div></>}

        {page === 'payment' && <><BackButton onClick={() => setPage('guest')}>Back to guest details</BackButton><PageTitle eyebrow="04 / 09 · PAYSTACK TEST CHECKOUT" title="Complete your reservation.">Secure payment is handled by Paystack's hosted checkout.</PageTitle><div className="content-grid"><Panel className="pay-panel"><div className="paystack-wordmark">paystack</div><p className="eyebrow">TEST MODE · RUBY HOTEL</p><strong className="big-total">{formatNaira(total)}</strong><p>{guest.email}</p><div className="payment-methods">Card <span>·</span> Bank transfer <span>·</span> USSD</div><div className="demo-callout"><ShieldCheck size={17} /><span>Demo only. No real payment details are collected on this page.</span></div><button className="button button-primary full-width" onClick={openDemoCheckout}>Open Paystack test checkout <ArrowRight size={15} /></button><p className="fine-print">Production frontend should redirect to the checkout URL returned by the backend.</p></Panel><aside><StayCard room={room} checkIn={stay.checkIn} checkOut={stay.checkOut} guests={stay.guests} nights={nights} total={total} /></aside></div></>}

        {page === 'provider' && <><PageTitle eyebrow="04A / 09 · TEST PAYMENT" title="Paystack test checkout.">This screen simulates the hosted payment handoff.</PageTitle><div className="narrow-column"><Panel className="pay-panel"><div className="paystack-wordmark">paystack</div><p>Booking reference · {bookingReference}</p><strong className="big-total">{formatNaira(total)}</strong><div className="demo-callout"><ShieldCheck size={17} /><span>Simulation only. These buttons do not contact Paystack or charge money.</span></div><button className="button button-primary full-width" onClick={() => simulatePayment('paid')}>Simulate successful payment <Check size={15} /></button><button className="button button-outline full-width spaced-button" onClick={() => simulatePayment('failed')}>Simulate failed payment</button><button className="text-button centered" onClick={() => setPage('payment')}>Cancel and return to booking</button></Panel><p className="fine-print">Backend task: initialize Paystack, validate the callback, and verify the transaction server-side before marking a booking confirmed.</p></div></>}

        {page === 'verifying' && <><PageTitle eyebrow="05 / 09 · SERVER VERIFICATION" title="We're confirming your payment.">Please don't pay again while we check.</PageTitle><div className="narrow-column"><Panel className="status-panel"><span className="status-chip status-pending"><Clock3 size={13} /> PAYMENT · PROCESSING</span><h2>Checkout received</h2><p>We're checking the transaction with Paystack. Your booking remains pending until payment is verified.</p><p>Booking · Pending<br />Payment · Verifying<br />Reference · {bookingReference}</p></Panel><div className="button-stack"><button className="button button-primary full-width" onClick={confirmPayment}>Check payment status</button><button className="text-button centered" onClick={() => setPage('booking')}>Return to my booking</button></div><p className="fine-print">In the live app, this button asks the backend for verified status. A browser redirect alone is not proof of payment.</p></div></>}

        {page === 'failed' && <><PageTitle eyebrow="04B · RECOVERY BRANCH" title="Payment didn't go through.">Your booking is not confirmed yet.</PageTitle><div className="narrow-column"><Panel className="status-panel status-error"><span className="status-chip status-failed">PAYMENT · FAILED</span><h2>You can safely try again.</h2><p>We couldn't complete this test transaction. Your booking details are saved, but no stay is confirmed.</p><p>Booking · Pending<br />Payment · Failed<br />Reference · {bookingReference}</p></Panel><div className="button-stack"><button className="button button-primary full-width" onClick={() => setPage('payment')}>Try payment again <ArrowRight size={15} /></button><button className="text-button centered" onClick={() => setPage('guest')}>Back to guest details</button></div><p className="fine-print">If you see a debit, check payment status before retrying and contact reception with your reference.</p></div></>}

        {page === 'confirmed' && <><PageTitle eyebrow="06 / 09 · VERIFIED SUCCESS" title="Your stay is confirmed.">We look forward to welcoming you{guest.name ? `, ${guest.name.split(' ')[0]}` : ''}.</PageTitle><div className="content-grid"><Panel className="confirmation-card"><span className="status-chip status-success"><CheckCircle2 size={14} /> CONFIRMED · PAYMENT VERIFIED</span><h2>{bookingReference}</h2><p>{room?.name} · {stay.guests} guests<br />{stay.checkIn} to {stay.checkOut} · {nights} nights</p><p>Paid in test mode · {formatNaira(total)}</p><p className="fine-print">A confirmation will be sent to {guest.email} after the backend records the verified payment.</p><button className="button button-primary" onClick={() => setPage('booking')}>Go to my booking <ArrowRight size={15} /></button></Panel><aside><StayCard room={room} checkIn={stay.checkIn} checkOut={stay.checkOut} guests={stay.guests} nights={nights} total={total} /></aside></div></>}

        {page === 'lookup' && <><PageTitle eyebrow="07 / 09 · MY BOOKING" title="Everything for your stay.">Find your booking with its reference and booking email.</PageTitle><div className="content-grid"><div><Panel className="confirmation-card"><span className="status-chip status-success">{paymentState === 'paid' ? 'CONFIRMED · ' : 'BOOKING · '}{bookingReference}</span><h2>{room?.name || 'Deluxe room'}</h2><p>{stay.checkIn} to {stay.checkOut} · {nights} nights<br />1 room · {stay.guests} guests</p><p>Payment · {paymentState === 'paid' ? 'Verified in test mode' : 'Pending demo'}</p></Panel><Panel><h3>A little extra comfort.</h3><p>Pre-arrival details, room access simulation, preferences, and service requests live here.</p>{bookingActions}</Panel></div><form className="form-panel" onSubmit={lookupBooking}><h3>Find another booking</h3><label className="field"><span>Booking reference</span><input value={bookingReference} onChange={(event) => setBookingReference(event.target.value)} required placeholder="RUB-260112" /></label><label className="field"><span>Booking email</span><input type="email" value={lookupEmail} onChange={(event) => setLookupEmail(event.target.value)} required placeholder="you@example.com" /></label>{lookupMessage && <p className="form-message" role="status">{lookupMessage}</p>}<button className="button button-outline full-width" type="submit">Find booking</button>{guest.email && <p className="fine-print">Demo booking email: {guest.email}</p>}</form></div></>}

        {page === 'booking' && <><BackButton onClick={() => setPage('search')}>Browse rooms</BackButton><PageTitle eyebrow="07 / 09 · MY BOOKING" title="Everything for your stay.">Welcome back{guest.name ? `, ${guest.name.split(' ')[0]}` : ''}. Your booking is {paymentState === 'paid' ? 'confirmed' : 'pending'}.</PageTitle><div className="content-grid"><Panel className="confirmation-card"><span className={`status-chip ${paymentState === 'paid' ? 'status-success' : 'status-pending'}`}>{paymentState === 'paid' ? 'CONFIRMED · PAYMENT VERIFIED' : 'BOOKING · PAYMENT PENDING'}</span><h2>{bookingReference}</h2><p>{room?.name || 'Deluxe room'} · {stay.guests} guests<br />{stay.checkIn} to {stay.checkOut} · {nights} nights</p><p>{paymentState === 'paid' ? `Paid in test mode · ${formatNaira(total)}` : 'Payment is not confirmed.'}</p><div className="button-stack"><button className="button button-primary" onClick={() => setPage('concierge')}>Request a service</button><button className="button button-outline" onClick={() => setPage('tracking')}>View request tracking ({requests.length})</button></div></Panel><aside className="booking-tools"><StayCard room={room} checkIn={stay.checkIn} checkOut={stay.checkOut} guests={stay.guests} nights={nights} total={total} />{bookingActions}</aside></div></>}

        {page === 'concierge' && <><BackButton onClick={() => setPage('booking')}>Back to my booking</BackButton><PageTitle eyebrow="08 / 09 · CONCIERGE REQUEST" title="What can we help with?">For booking {bookingReference} · {room?.name || 'Deluxe room'}</PageTitle><div className="content-grid"><form className="form-panel" onSubmit={submitService}><label className="field"><span>Choose a service</span><select value={service} onChange={(event) => setService(event.target.value)}><option>Extra towels</option><option>Room cleaning</option><option>Airport pickup</option><option>Food and drinks</option></select></label><div className="service-hint"><ConciergeBell size={18} /><span>{service === 'Extra towels' ? 'Fresh towels delivered to your room.' : service === 'Room cleaning' ? 'Refresh your room during your stay.' : service === 'Airport pickup' ? 'Share your flight details in the note.' : 'Ask the team about available options.'}</span></div><label className="field"><span>Note (optional)</span><textarea rows="4" value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} placeholder="Anything else the team should know?" /></label><p className="fine-print">Any service charges will be agreed with reception. No extra payment is collected here.</p><button className="button button-primary full-width" type="submit">Submit request <ArrowRight size={15} /></button></form><aside><StayCard room={room} checkIn={stay.checkIn} checkOut={stay.checkOut} guests={stay.guests} nights={nights} total={total} /><Panel><h3>What happens next?</h3><p>Received → In progress → Completed</p><p className="fine-print">Check the latest status from your booking.</p></Panel></aside></div></>}

        {page === 'tracking' && <><BackButton onClick={() => setPage('booking')}>Back to my booking</BackButton><PageTitle eyebrow="09 / 09 · SERVICE TRACKING" title="We're taking care of it.">Request · {requests[0]?.id || 'No request yet'} · Booking {bookingReference}</PageTitle><div className="content-grid"><div className="request-list">{requests.length === 0 ? <Panel><h3>No service requests yet</h3><p>When you submit a concierge request, its status will appear here.</p><button className="button button-primary" onClick={() => setPage('concierge')}>Request a service</button></Panel> : requests.map((request) => <Panel key={request.id} className="request-card"><span className={`status-chip ${request.status === 'Completed' ? 'status-success' : 'status-pending'}`}>{request.service.toUpperCase()} · {request.status.toUpperCase()}</span><h3>Your request is with {request.status === 'Completed' ? 'the team' : 'housekeeping'}.</h3><p>{request.id} · {request.time}</p><p>{request.note || 'Your request was sent to the hotel.'}</p><div className="request-timeline"><span className="done">1 · Received</span><span className={request.status !== 'Received' ? 'done' : ''}>2 · In progress</span><span className={request.status === 'Completed' ? 'done' : ''}>3 · Completed</span></div></Panel>)}</div><aside><Panel><h3>Your requests</h3><p>{requests.length} request{requests.length === 1 ? '' : 's'} for this stay</p><button className="button button-primary full-width" onClick={() => setPage('concierge')}>Request another service</button><button className="text-button centered" onClick={refreshRequests}>Refresh status</button></Panel></aside></div></>}

        {page === 'arrival' && <><BackButton onClick={() => setPage('booking')}>Back to my booking</BackButton><PageTitle eyebrow="P1 · STRETCH 10 · AFTER CORE" title="Arrive a little more relaxed.">Pre-arrival check-in · {bookingReference}</PageTitle><div className="content-grid"><form className="form-panel" onSubmit={(event) => { event.preventDefault(); /* Backend: POST /api/bookings/{bookingId}/pre-arrival. Staff review is still required. */ setArrivalSubmitted(true); }}><p className="eyebrow">YOUR ARRIVAL</p><label className="field"><span>Expected arrival</span><select value={arrival.time} onChange={(event) => setArrival({ ...arrival, time: event.target.value })}><option>2:00 pm</option><option>3:00 pm</option><option>4:00 pm</option><option>5:00 pm</option><option>6:00 pm</option></select></label><label className="field"><span>Special requests (optional)</span><textarea rows="3" value={arrival.note} onChange={(event) => setArrival({ ...arrival, note: event.target.value })} placeholder="A quiet room, if available." /></label><label className="field"><span>Contact number</span><input type="tel" value={arrival.phone} onChange={(event) => setArrival({ ...arrival, phone: event.target.value })} placeholder={guest.phone || '+234 800 000 0000'} /></label><button className="button button-primary full-width" type="submit">Submit pre-arrival details</button>{arrivalSubmitted && <p className="success-message" role="status">Details submitted for staff review. Your booking remains confirmed.</p>}<p className="fine-print">Reception reviews your details before check-in is approved.</p></form><aside><Panel><h3>Check-in status</h3><strong className="status-text">{arrivalSubmitted ? 'Submitted · Awaiting reception review' : 'Not submitted'}</strong><p>Next: submit details → staff review → approved.</p></Panel><Panel><h3>Identity status · Not verified</h3><p>Bring a valid ID to reception. This demo does not upload documents or verify identity.</p></Panel></aside></div></>}

        {page === 'access' && <><BackButton onClick={() => setPage('booking')}>Back to my booking</BackButton><PageTitle eyebrow="P1 · STRETCH 11 · SIMULATED ACCESS" title="Your room, ready for you.">Access is shown only after staff approval.</PageTitle><div className="narrow-column"><Panel className="access-card"><p className="eyebrow">DEMO KEY · NOT A REAL DOOR LOCK</p>{checkInApproved ? <><h2>Room 120</h2><p>Floor 5 · {room?.name || 'Deluxe room'}</p><p>Check-in · Approved by reception (demo)<br />Identity · Checked at reception (demo)<br />Valid until {stay.checkOut}, 12:00 pm</p><div className="access-code">482 619</div><button className="button button-primary full-width" onClick={() => setNotice('Demo access simulated. No real lock was contacted.')}>Simulate room access</button></> : <><h2>Access available after approval</h2><p>Before check-in approval, no room number or code is shown.</p><p>For real access, collect your key at reception.</p></>}</Panel><p className="fine-print">The access control is a prototype only. It does not connect to or unlock a real door.</p>{notice && <p className="success-message">{notice}</p>}</div></>}

        {page === 'recommendations' && <><BackButton onClick={() => setPage('booking')}>Back to my booking</BackButton><PageTitle eyebrow="P2 · STRETCH 12 · CURATED, NOT MACHINE LEARNING" title="A stay that feels like you.">Optional recommendations and simple example points.</PageTitle><div className="content-grid"><form className="form-panel" onSubmit={(event) => { event.preventDefault(); /* Backend: save preference and return curated offers. */ setNotice('Preference saved in this demo.'); }}><label className="field"><span>Your preference</span><select value={preference} onChange={(event) => setPreference(event.target.value)}><option>Quiet stay · Relaxation</option><option>Explore Abuja · Local experiences</option><option>Fitness · Gym and wellness</option></select></label><h3>A slower start to your day.</h3><p>Ask reception about breakfast in your room and available spa times.</p><p className="fine-print">Curated from your selected preference. Availability and prices are confirmed by the hotel.</p><button className="button button-primary full-width" type="submit">Save preference</button>{notice && <p className="success-message">{notice}</p>}</form><aside><Panel><p className="eyebrow">YOUR POINTS · EXAMPLE BALANCE</p><strong className="big-total">180 points</strong><p>Pending from this stay · {Math.floor(total / 1000)} points (example only)</p><p className="fine-print">Points shown for the demo. No loyalty account or redemption is connected.</p></Panel></aside></div></>}

        {page === 'staff' && <><PageTitle eyebrow="SUPPORTING CORE · STAFF-ONLY DEMO VIEW" title="Guest requests, in one place.">Reception and service teams · access control must be enforced by the backend.</PageTitle><div className="staff-summary"><Panel><span className="eyebrow">RECEIVED</span><strong>{requests.filter((item) => item.status === 'Received').length}</strong></Panel><Panel><span className="eyebrow">IN PROGRESS</span><strong>{requests.filter((item) => item.status === 'In progress').length}</strong></Panel><Panel><span className="eyebrow">COMPLETED</span><strong>{requests.filter((item) => item.status === 'Completed').length}</strong></Panel></div><Panel className="staff-table"><div className="staff-table-head"><span>REQUEST / GUEST</span><span>SERVICE / NOTE</span><span>STATUS / NEXT ACTION</span></div>{requests.length === 0 ? <p>No requests to display. Submit a guest request first.</p> : requests.map((request) => <div className="staff-row" key={request.id}><div><strong>{request.id} · {bookingReference}</strong><small>{guest.name || 'Guest'} · {room?.name || 'Deluxe room'}</small></div><div><strong>{request.service}</strong><small>{request.note || 'No additional note.'}</small></div><div><strong>{request.status}</strong>{request.status === 'Received' && <button className="button button-outline" onClick={() => updateRequestStatus(request.id, 'In progress')}>Mark in progress</button>}{request.status === 'In progress' && <button className="button button-outline" onClick={() => updateRequestStatus(request.id, 'Completed')}>Mark completed</button>}</div></div>)}</Panel><Panel className="staff-approval"><h3>Pre-arrival review</h3><p>{arrivalSubmitted ? 'Guest arrival details are waiting for staff approval.' : 'No pre-arrival details have been submitted yet.'}</p><button className="button button-primary" disabled={!arrivalSubmitted} onClick={() => setCheckInApproved(true)}>Approve check-in (demo)</button>{checkInApproved && <span className="success-message"> Approved in demo. No identity check was performed.</span>}<p className="fine-print">Backend: protect this view with staff authentication and audit all request or check-in status changes.</p></Panel></>}
      </main>
      <Footer onNavigate={setPage} />
    </div>
  );
}
