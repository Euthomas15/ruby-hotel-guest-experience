// Temporary sample rooms let us build the screen before the backend is ready.
// Later, the same cards can display room data returned by the hotel API.
export const rooms = [
  {
    id: 'standard',
    name: 'Standard room',
    description: 'A calm, comfortable room for an easy city stay.',
    features: ['Queen bed', '2 guests', 'Wi-Fi'],
    pricePerNight: 65000,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Bright hotel room with a neatly made bed',
  },
  {
    id: 'deluxe',
    name: 'Deluxe room',
    description: 'A restful retreat with a king bed and warm interiors.',
    features: ['King bed', '2 guests', '32 m²'],
    pricePerNight: 90000,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Warm and inviting hotel room',
  },
  {
    id: 'executive',
    name: 'Executive room',
    description: 'Extra space to unwind, with a lounge area.',
    features: ['King bed', 'Lounge', '2 guests'],
    pricePerNight: 120000,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Elegant hotel suite with a spacious sitting area',
  },
];

// Format prices consistently as Nigerian naira (NGN).
export function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}
