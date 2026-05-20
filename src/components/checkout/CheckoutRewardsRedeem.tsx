'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import { useCheckoutContext } from '@/context/CheckoutContext';
import { applyRedemption, computeRedemptionCap } from '@/lib/rewards';

type RewardsInfo = {
  balance: number;
  redemptionPoints: number;
  redemptionDollars: number;
  minToRedeem: number;
  maxRedemptionPercent: number;
  maxRedemptionDollars: number;
};

const fmt = (n: number) => n.toLocaleString('en-US');
const fmtDollars = (cents: number) => (cents / 100).toFixed(2);

type Props = {
  /** Pre-tax retail subtotal. Used to compute the per-order cap. */
  subtotal: number;
  /** Subtotal minus member + promo discounts. The redemption can't bring this below zero. */
  maxDiscountable: number;
};

export default function CheckoutRewardsRedeem({ subtotal, maxDiscountable }: Props) {
  const { data: session } = useSession();
  const { state, dispatch } = useCheckoutContext();
  const isLoggedIn = Boolean(session?.user);

  const [info, setInfo] = useState<RewardsInfo | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    fetch('/api/me/rewards')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: RewardsInfo) => {
        if (cancelled) return;
        setInfo(data);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Drop any redemption when the user signs out or balance vanishes mid-flow.
  useEffect(() => {
    if (!isLoggedIn && state.pointsToRedeem > 0) {
      dispatch({ type: 'SET_REDEMPTION', payload: { points: 0, dollars: 0 } });
    }
  }, [isLoggedIn, state.pointsToRedeem, dispatch]);

  // Cap the redemption to the discountable subtotal so a customer can't
  // redeem more dollars than the order is worth pre-tax. If the discountable
  // drops below the applied redemption mid-flow (cart edit, promo apply),
  // clear the persisted redemption in the effect and follow up with the local
  // draft clear via the adjust-during-render block below, which catches the
  // pointsDiscount → 0 transition without a setState-in-effect.
  useEffect(() => {
    if (state.pointsDiscount > maxDiscountable) {
      dispatch({ type: 'SET_REDEMPTION', payload: { points: 0, dollars: 0 } });
    }
  }, [maxDiscountable, state.pointsDiscount, dispatch]);

  const [lastPointsDiscount, setLastPointsDiscount] = useState(state.pointsDiscount);
  if (lastPointsDiscount !== state.pointsDiscount) {
    setLastPointsDiscount(state.pointsDiscount);
    if (state.pointsDiscount === 0 && draft !== '') {
      setDraft('');
    }
  }

  const previewResult = useMemo(() => {
    if (!info) return null;
    const requested = Number(draft);
    if (!Number.isFinite(requested) || requested <= 0) return null;
    return applyRedemption({
      pointsToRedeem: Math.floor(requested),
      currentBalance: info.balance,
      settings: info,
      orderSubtotalDollars: subtotal,
    });
  }, [draft, info, subtotal]);

  if (!isLoggedIn || loadFailed) return null;
  if (!info) {
    return (
      <div className='mb-3.5 rounded-sm border border-line-soft bg-paper px-8 py-7'>
        <p className='text-[12px] text-muted'>Loading rewards…</p>
      </div>
    );
  }

  const block = info.redemptionPoints;
  const ratio = `${fmt(info.redemptionPoints)} pts = $${
    Number.isInteger(info.redemptionDollars)
      ? info.redemptionDollars
      : info.redemptionDollars.toFixed(2)
  } off`;

  // Per-order cap (min of percent × subtotal, flat $) — mirrors the server.
  const orderCap = computeRedemptionCap(subtotal, info);
  // Cap redemption dollars to the smaller of: per-order cap, what's still
  // owed after other discounts.
  const dollarCap = Math.max(0, Math.min(orderCap.capDollars, maxDiscountable));
  const maxRedeemableByValue =
    info.redemptionDollars > 0
      ? Math.floor(dollarCap / info.redemptionDollars) * block
      : 0;
  const balanceFloor = info.balance - (info.balance % block);
  const maxRedeemable = Math.max(0, Math.min(balanceFloor, maxRedeemableByValue));

  const hasEnoughToRedeem = info.balance >= Math.max(block, info.minToRedeem);
  const active = state.pointsToRedeem > 0;
  // A promo that opts into stacking (excludesPoints === false) leaves the
  // redemption open. Default promos block it; the customer removes the promo
  // first if they prefer to spend points on this order.
  const blockedByPromo =
    state.promoDiscount > 0 && state.promoExcludesPoints && !active;

  const onApply = () => {
    setError(null);
    if (!previewResult) {
      setError(`Enter at least ${fmt(Math.max(block, info.minToRedeem))} points`);
      return;
    }
    if (!previewResult.valid) {
      setError(previewResult.error);
      return;
    }
    if (previewResult.valueCents / 100 > dollarCap + 0.005) {
      setError(
        previewResult.valueCents / 100 > maxDiscountable + 0.005
          ? "Can't redeem more than the order's discountable subtotal"
          : `Per-order cap is $${orderCap.capDollars.toFixed(2)}`,
      );
      return;
    }
    dispatch({
      type: 'SET_REDEMPTION',
      payload: {
        points: previewResult.pointsUsed,
        dollars: previewResult.valueCents / 100,
      },
    });
    setDraft('');
  };

  const onRemove = () => {
    dispatch({ type: 'SET_REDEMPTION', payload: { points: 0, dollars: 0 } });
    setDraft('');
    setError(null);
  };

  const onUseMax = () => {
    if (maxRedeemable <= 0) return;
    setDraft(String(maxRedeemable));
    setError(null);
  };

  return (
    <div className='mb-3.5 rounded-sm border border-line-soft bg-paper px-8 py-7'>
      <div className='mb-1.5 flex items-baseline justify-between gap-2'>
        <p className='text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
          → Rewards balance
        </p>
        <span className='font-mono text-[11px] tracking-[0.04em] text-muted'>
          {ratio}
        </span>
      </div>
      <div className='mb-2 flex items-baseline justify-between gap-2'>
        <span className='font-display text-[22px] font-medium tracking-tight'>
          {fmt(info.balance)} <em className='text-[14px] font-normal text-muted'>pts available</em>
        </span>
        {active && (
          <button
            type='button'
            onClick={onRemove}
            className='border-b border-line pb-px text-[12px] font-medium tracking-[0.04em] text-ink-soft transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
          >
            Remove
          </button>
        )}
      </div>
      {!active && !blockedByPromo && dollarCap > 0 && (
        <p className='mb-5 font-mono text-[11px] tracking-[0.04em] text-muted'>
          Max on this order: ${dollarCap.toFixed(2)}
        </p>
      )}

      {active ? (
        <p className='flex items-center gap-1.5 text-[12px] text-green'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.5} aria-hidden='true' className='h-3 w-3 shrink-0'>
            <polyline points='20 6 9 17 4 12' />
          </svg>
          {fmt(state.pointsToRedeem)} pts applied · ${state.pointsDiscount.toFixed(2)} off
        </p>
      ) : blockedByPromo ? (
        <p className='text-[12px] text-muted'>
          Remove the promo code to redeem points on this order instead.
        </p>
      ) : !hasEnoughToRedeem ? (
        <p className='text-[12px] text-muted'>
          Earn at least {fmt(Math.max(block, info.minToRedeem))} points to redeem on a future order.
        </p>
      ) : (
        <>
          <div className='flex gap-2'>
            <input
              type='number'
              inputMode='numeric'
              min={block}
              max={maxRedeemable}
              step={block}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              placeholder={`Redeem in ${fmt(block)}-pt blocks`}
              aria-label='Points to redeem'
              className='flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-[13px] text-ink outline-none placeholder:text-muted transition-colors duration-200 focus:border-ink'
            />
            <button
              type='button'
              onClick={onUseMax}
              disabled={maxRedeemable <= 0}
              className='rounded-full border border-line bg-cream px-4 py-2.5 text-[12px] font-medium tracking-[0.04em] text-ink-soft transition-colors duration-200 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50'
            >
              Use {fmt(maxRedeemable)}
            </button>
            <button
              type='button'
              onClick={onApply}
              className='rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
            >
              Apply
            </button>
          </div>

          {previewResult && previewResult.valid && !error && (
            <p className='mt-2 text-[12px] text-ink-soft'>
              {fmt(previewResult.pointsUsed)} pts will save you ${fmtDollars(previewResult.valueCents)}
            </p>
          )}

          {error && (
            <p className='mt-2 flex items-center gap-1.5 text-[12px] text-oxblood'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3 w-3 shrink-0'>
                <circle cx='12' cy='12' r='10' /><line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
