import { describe, it, expect } from 'vitest';
import { applyDiscount, totalize } from '../lib/cart';
import { POST } from '../app/api/cart/apply-promo/route';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// lib/cart · applyDiscount
// ---------------------------------------------------------------------------
describe('applyDiscount', () => {
  it('returns 0 for null code', () => {
    expect(applyDiscount(2000, null)).toBe(0);
  });

  it('WELCOME10 applies 10 % discount', () => {
    expect(applyDiscount(2000, 'WELCOME10')).toBe(200);
  });

  it('WELCOME10 is case-insensitive', () => {
    expect(applyDiscount(2000, 'welcome10')).toBe(200);
  });

  it('VIP25 applies 25 % when subtotal >= 10 000 cents', () => {
    expect(applyDiscount(10_000, 'VIP25')).toBe(2500);
  });

  it('VIP25 gives 0 discount below the threshold', () => {
    expect(applyDiscount(9_999, 'VIP25')).toBe(0);
  });

  it('FREESHIP gives 0 discount (shipping not in cart model)', () => {
    expect(applyDiscount(5000, 'FREESHIP')).toBe(0);
  });

  it('unknown code gives 0 discount', () => {
    expect(applyDiscount(5000, 'NOPE99')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// lib/cart · totalize with discount
// ---------------------------------------------------------------------------
describe('totalize with promo code', () => {
  it('WELCOME10 reduces total correctly', () => {
    const totals = totalize(
      [{ productId: 'p1', quantity: 2, unitPriceCents: 1000 }],
      'WELCOME10',
      'GB',
    );
    // subtotal=2000, discount=200, taxable=1800, tax=360, total=2160
    expect(totals.subtotalCents).toBe(2000);
    expect(totals.discountCents).toBe(200);
    expect(totals.taxCents).toBe(360);
    expect(totals.totalCents).toBe(2160);
  });

  it('discount does not push taxable below 0', () => {
    const totals = totalize(
      [{ productId: 'p1', quantity: 1, unitPriceCents: 100 }],
      'VIP25',
      'GB',
    );
    // subtotal=100, VIP25 threshold not met → discount=0
    expect(totals.discountCents).toBe(0);
    expect(totals.totalCents).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/cart/apply-promo · route handler
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/cart/apply-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/cart/apply-promo', () => {
  it('returns 200 with totals for a valid request', async () => {
    const req = makeRequest({
      items: [{ productId: 'p1', quantity: 2, unitPriceCents: 1000 }],
      promoCode: 'WELCOME10',
      region: 'GB',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.subtotalCents).toBe(2000);
    expect(data.discountCents).toBe(200);
    expect(data.totalCents).toBe(2160);
  });

  it('returns 200 with 0 discount for an unknown promo code', async () => {
    const req = makeRequest({
      items: [{ productId: 'p1', quantity: 1, unitPriceCents: 500 }],
      promoCode: 'DOESNOTEXIST',
      region: 'GB',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.discountCents).toBe(0);
  });

  it('returns 400 when items array is empty', async () => {
    const req = makeRequest({ items: [], promoCode: 'WELCOME10', region: 'GB' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when promoCode is missing', async () => {
    const req = makeRequest({
      items: [{ productId: 'p1', quantity: 1, unitPriceCents: 500 }],
      region: 'GB',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/cart/apply-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
