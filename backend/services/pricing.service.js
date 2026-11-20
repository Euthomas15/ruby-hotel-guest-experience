const VAT_RATE = 0.075;

function parseStay(checkInValue, checkOutValue) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    typeof checkInValue !== "string" ||
    typeof checkOutValue !== "string" ||
    !datePattern.test(checkInValue) ||
    !datePattern.test(checkOutValue)
  ) {
    return null;
  }

  const checkIn = new Date(`${checkInValue}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutValue}T00:00:00.000Z`);
  if (
    Number.isNaN(checkIn.getTime()) ||
    Number.isNaN(checkOut.getTime()) ||
    checkIn.toISOString().slice(0, 10) !== checkInValue ||
    checkOut.toISOString().slice(0, 10) !== checkOutValue ||
    checkOut <= checkIn
  ) {
    return null;
  }

  const nights = (checkOut.getTime() - checkIn.getTime()) / 86400000;
  return { checkIn, checkOut, nights };
}

function calculateQuote({ rate, nights, roomCount, currency = "NGN" }) {
  const numericRate = Number(rate);
  const numericNights = Number(nights);
  const numericRoomCount = Number(roomCount);

  if (
    !Number.isFinite(numericRate) ||
    numericRate <= 0 ||
    !Number.isInteger(numericNights) ||
    numericNights < 1 ||
    !Number.isInteger(numericRoomCount) ||
    numericRoomCount < 1
  ) {
    return null;
  }

  const subtotalCents = Math.round(numericRate * 100) * numericNights * numericRoomCount;
  const vatCents = Math.round(subtotalCents * VAT_RATE);

  return {
    currency,
    nights: numericNights,
    roomCount: numericRoomCount,
    subtotal: subtotalCents / 100,
    vatRate: VAT_RATE,
    vatAmount: vatCents / 100,
    total: (subtotalCents + vatCents) / 100,
  };
}

module.exports = { VAT_RATE, parseStay, calculateQuote };
