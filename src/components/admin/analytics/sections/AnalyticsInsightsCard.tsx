import type { ReactNode } from 'react';

import type { AnalyticsData } from '../AnalyticsClient';

// The customer funnel half of this section was removed because it relied on
// hardcoded visitor / cart / checkout counts. It returns as a real block when
// the event-tracking subsystem ships (separate spec). Only the insights card
// stays — every bullet is computed from real numbers.

type Insight = { tag: 'up' | 'alert'; body: ReactNode };

export default function AnalyticsInsightsCard({ data }: { data: AnalyticsData }) {
  // Bodies render as JSX so React escapes interpolated values — product
  // names in particular are admin-controlled free text and must never reach
  // the DOM as raw HTML.
  const insights: Insight[] = [
    {
      tag: 'up',
      body: data.topSellerName ? (
        <>
          <strong>{data.topSellerName}</strong> is your top earner this period — consider featuring it.
        </>
      ) : (
        <>
          <strong>Beef cuts</strong> are driving the majority of this period&apos;s revenue.
        </>
      ),
    },
    {
      tag: 'alert',
      body: data.cancelRate > 5 ? (
        <>
          <strong>Cancellation rate is {data.cancelRate.toFixed(1)}%</strong> — higher than usual. Worth investigating.
        </>
      ) : (
        <>
          <strong>Cancellation rate is healthy</strong> — below 5%. Keep it up.
        </>
      ),
    },
    {
      tag: 'up',
      body: (
        <>
          <strong>
            {data.newCustomers} new customers this period{data.newCustomersChange > 0 ? `, +${data.newCustomersChange.toFixed(0)}%` : ''}
          </strong>{' '}
          — track repeat orders over the next 30 days.
        </>
      ),
    },
  ];

  return (
    <div className="mb-4">
      <div className="bg-linear-to-br from-paper to-cream-deep border border-line-soft rounded-sm p-7 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-50 h-50 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.15)_0%,transparent_60%)] pointer-events-none" />
        <div className="flex items-center gap-2.5 mb-5 relative">
          <span className="w-8 h-8 rounded-full bg-oxblood text-cream grid place-items-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          {/* h2, not h3: this is the only section heading on the analytics
              page, so it sits directly under the page header's h1. */}
          <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
            Worth <em className="italic text-oxblood">knowing</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-3.5 px-4.5 py-3.5 bg-cream border border-line-soft rounded-sm">
              <span
                className={`font-mono text-[9px] tracking-[0.18em] uppercase px-2 py-0.75 rounded-sm shrink-0 mt-px ${
                  ins.tag === 'up'
                    ? 'bg-green-soft text-green-deep'
                    : 'bg-red-soft text-oxblood'
                }`}
              >
                {ins.tag === 'up' ? 'Up' : 'Alert'}
              </span>
              <p className="text-[13px] text-ink-soft leading-[1.55] flex-1 [&_strong]:text-ink [&_strong]:font-medium">
                {ins.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
