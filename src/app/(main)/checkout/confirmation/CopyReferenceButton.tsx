'use client';

import { useEffect, useRef, useState } from 'react';

import { FOCUS_RING_DARK } from '@/lib/styles';
import CheckIcon from '@/components/uielements/CheckIcon';

type Props = {
  // The bare reference, without the leading '#'. That character is decoration
  // on screen and would only get in the way when the customer pastes it.
  reference: string;
};

const RESET_MS = 1800;

// Copying the reference is the one thing on this page that has to happen in
// the browser. It sits on the dark hero, so the focus ring is the dark variant.
const CopyReferenceButton = ({ reference }: Props) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A customer who copies twice in quick succession would otherwise have the
  // first timeout clear the label while the second copy is still fresh.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      // Absent over plain http and when the permission is denied, so this is
      // a real branch rather than defensive noise.
      if (!navigator.clipboard) return;
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), RESET_MS);
    } catch {
      // Nothing useful to say — the reference is on screen to be read.
    }
  };

  return (
    <>
      <button
        type='button'
        onClick={handleCopy}
        // The width is reserved for the wider "Copied" state: the reference
        // beside it is monospaced and can't shrink or wrap, so a button that
        // grew on click pushed itself out of the card on a narrow phone.
        // The offset matches the card this sits on rather than the hero
        // behind it, so the ring doesn't draw a darker halo.
        className={`inline-flex min-h-11 min-w-24 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-[12.5px] transition-colors duration-300 motion-reduce:transition-none ${FOCUS_RING_DARK} focus-visible:ring-offset-ink-soft ${
          copied
            ? 'border-camel-soft text-camel-soft'
            : 'border-cream/25 text-cream/75 hover:border-cream/50 hover:text-cream'
        }`}
      >
        {copied && <CheckIcon className='h-3 w-3' />}
        {copied ? 'Copied' : 'Copy'}
        <span className='sr-only'> order reference</span>
      </button>
      {/* The label swap is the only feedback a sighted customer gets, so it
          has to be spoken too. Kept outside the button: nested inside, the
          text joined the button's own name ("Copied Reference … copied"), and
          a live region inside the element that currently holds focus is the
          one place screen readers are least reliable about announcing. */}
      <span aria-live='polite' className='sr-only'>
        {copied ? `Reference ${reference} copied` : ''}
      </span>
    </>
  );
};

export default CopyReferenceButton;
