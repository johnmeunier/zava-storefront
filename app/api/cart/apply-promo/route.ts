import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cartItemSchema, totalize } from "@/lib/cart";

const ApplyPromoSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  promoCode: z.string().min(1).max(64),
  region: z.string().min(1).max(16),
});

/**
 * POST /api/cart/apply-promo
 *
 * Applies a promo code to a cart and returns the computed totals.
 *
 * @param req - JSON body `{ items: CartItem[], promoCode: string, region: string }`
 * @returns 200 with `CartTotals` on success, 400 on validation failure.
 * @example
 * ```ts
 * const res = await fetch('/api/cart/apply-promo', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     items: [{ productId: 'p1', quantity: 2, unitPriceCents: 1000 }],
 *     promoCode: 'WELCOME10',
 *     region: 'GB',
 *   }),
 * });
 * // { subtotalCents: 2000, discountCents: 200, taxCents: 360, totalCents: 2160 }
 * ```
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ApplyPromoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { items, promoCode, region } = parsed.data;
  const totals = totalize(items, promoCode, region);
  return NextResponse.json(totals);
}
