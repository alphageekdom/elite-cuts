'use client';

import { useState } from 'react';
import DeliveryReceiveCard from './DeliveryReceiveCard';
import DeliveriesReceivedList from './DeliveriesReceivedList';

export type DeliveryRow = {
  _id: string;
  deliveryDate: string;
  supplier: string;
  supplierSuffix: string;
  detail: string;
  status: 'confirmed' | 'pending' | 'scheduled' | 'received';
  productId: string | null;
  currentStock: number | null;
  parLevel: number | null;
};

export type ReceivedDeliveryRow = {
  _id: string;
  receivedAt: string;
  supplier: string;
  productName: string | null;
  receivedQty: number | null;
};

const LEGEND = [
  { status: 'scheduled', label: 'Scheduled', desc: 'Booked with supplier, not yet confirmed' },
  { status: 'pending',   label: 'Pending',   desc: 'Supplier acknowledged, awaiting dispatch' },
  { status: 'confirmed', label: 'Confirmed', desc: 'Date locked in — delivery is coming' },
  { status: 'received',  label: 'Received',  desc: 'Arrived — stock has been updated' },
] as const;

const LEGEND_DOT: Record<typeof LEGEND[number]['status'], string> = {
  scheduled: 'bg-muted',
  pending:   'bg-amber',
  confirmed: 'bg-green',
  received:  'bg-muted',
};

type Props = {
  deliveries: DeliveryRow[];
  receivedDeliveries: ReceivedDeliveryRow[];
};

export default function InventoryUpcomingDeliveries({ deliveries, receivedDeliveries }: Props) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'received'>('upcoming');

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      {/* Header + tab toggle */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="font-display text-[22px] font-medium tracking-tight leading-snug">
            Upcoming <em className="italic text-oxblood font-normal">deliveries</em>
          </div>
          <div className="text-[12px] text-muted mt-1">Next 14 days from active suppliers</div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 bg-ink/5 rounded p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            aria-pressed={activeTab === 'upcoming'}
            className={`px-2.5 py-1 rounded text-[11px] font-mono tracking-[0.04em] transition-colors ${
              activeTab === 'upcoming' ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Upcoming {deliveries.length > 0 ? `(${deliveries.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            aria-pressed={activeTab === 'received'}
            className={`px-2.5 py-1 rounded text-[11px] font-mono tracking-[0.04em] transition-colors ${
              activeTab === 'received' ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Received {receivedDeliveries.length > 0 ? `(${receivedDeliveries.length})` : ''}
          </button>
        </div>
      </div>

      {activeTab === 'upcoming' && (
        <>
          {/* Status legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6 p-3.5 rounded bg-ink/3 border border-line-soft">
            {LEGEND.map(({ status, label, desc }) => (
              <div key={status} className="flex items-start gap-2">
                <span className={`mt-0.75 w-1.5 h-1.5 rounded-full shrink-0 ${LEGEND_DOT[status]}`} />
                <div className="min-w-0">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-ink font-medium">{label}</span>
                  <span className="text-[10px] text-muted ml-1.5 leading-snug">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          {deliveries.length === 0 ? (
            <p className="text-muted text-[13px] py-8 text-center">No upcoming deliveries scheduled.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line-soft">
              {deliveries.map((d, idx) => (
                <DeliveryReceiveCard key={d._id} delivery={d} isFirst={idx === 0} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'received' && <DeliveriesReceivedList deliveries={receivedDeliveries} />}
    </div>
  );
}
