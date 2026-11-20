const test = require("node:test");
const assert = require("node:assert/strict");
const { parseStay, calculateQuote } = require("../services/pricing.service");

test("parses date-only stays without timezone drift", () => {
  const stay = parseStay("2026-11-20", "2026-11-22");

  assert.equal(stay.nights, 2);
  assert.equal(stay.checkIn.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(stay.checkOut.toISOString(), "2026-11-22T00:00:00.000Z");
});

test("rejects invalid dates and stays that do not advance", () => {
  assert.equal(parseStay("2026-02-30", "2026-03-02"), null);
  assert.equal(parseStay("2026-11-22", "2026-11-20"), null);
  assert.equal(parseStay("2026-11-20T00:00:00Z", "2026-11-22"), null);
});

test("calculates the site rate plus 7.5 percent VAT", () => {
  const quote = calculateQuote({ rate: 65000, nights: 2, roomCount: 1 });

  assert.deepEqual(quote, {
    currency: "NGN",
    nights: 2,
    roomCount: 1,
    subtotal: 130000,
    vatRate: 0.075,
    vatAmount: 9750,
    total: 139750,
  });
});

test("calculates site totals for all three room types", () => {
  const totals = [65000, 90000, 120000].map((rate) =>
    calculateQuote({ rate, nights: 2, roomCount: 1 }).total
  );
  assert.deepEqual(totals, [139750, 193500, 258000]);
});

test("calculates multiple rooms and rejects invalid quote inputs", () => {
  assert.equal(
    calculateQuote({ rate: 90000, nights: 2, roomCount: 2 }).total,
    387000
  );
  assert.equal(calculateQuote({ rate: 65000, nights: 0, roomCount: 1 }), null);
  assert.equal(calculateQuote({ rate: 65000, nights: 1, roomCount: 1.5 }), null);
});
