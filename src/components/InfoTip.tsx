import { useEffect, useId, useRef, useState } from 'react';
import type { Fun } from '../content/schemas';
import { AudioButton } from './AudioButton';

const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches === true;

/**
 * The ⓘ button with a small joke or funny example. Opens on hover (mouse) and on tap/click;
 * a click keeps it open until you click elsewhere or press Escape.
 */
export function InfoTip({ fun }: { fun?: Fun }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [alignRight, setAlignRight] = useState(true);
  const wrap = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!fun) return null;

  const place = () => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) setAlignRight(r.left > window.innerWidth / 2);
  };

  return (
    <span
      ref={wrap}
      className="info"
      onMouseEnter={() => {
        if (!canHover()) return;
        place();
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (canHover() && !pinned) setOpen(false);
      }}
    >
      <button
        type="button"
        className="info-btn"
        aria-label="Show a funny example"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          place();
          if (pinned) {
            setPinned(false);
            setOpen(false);
          } else {
            setPinned(true);
            setOpen(true);
          }
        }}
      >
        i
      </button>
      {open && (
        <span id={id} role="note" className={`info-pop ${alignRight ? 'right' : 'left'}`}>
          <span className="info-sv">
            <span lang="sv">{fun.sv}</span>
            <AudioButton text={fun.sv} label="Play the funny example" />
          </span>
          <span className="info-en">{fun.en}</span>
          {fun.note && <span className="info-note">{fun.note}</span>}
        </span>
      )}
    </span>
  );
}
