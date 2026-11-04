'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ThoughtLine.css';

const GLYPH_DONE = 0.55;
const EMPTY_STEPS = [];

const fmt = ds => (ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`);
const spoken = ds =>
  ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

function useReducedMotion() {
  const [reduce, setReduce] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduce;
}

export default function ThoughtLine({
  label = 'Thinking…',
  doneLabel = '',
  renderLabel,
  glyph = 'sparkle',
  steps = EMPTY_STEPS,
  collapsible = true,
  collapseOnSettle = true,
  color = 'currentColor',
  glyphColor = '',
  fontSize = 16,
  shimmer = true,
  shimmerDuration = 1.8,
  settleDuration = 350,
  settleBlur = 2,
  working = true,
  settleAfter = 0,
  elapsed,
  showTimer = true,
  onSettle,
  className = '',
  style
}) {
  const reduce = useReducedMotion();
  const [autoSettled, setAutoSettled] = useState(false);
  const [open, setOpen] = useState(true);
  const isWorking = working && !autoSettled;
  const doneText = doneLabel || (showTimer ? 'Thought for' : 'Done thinking');
  const hasTrace = steps.length > 0;
  const sheen = shimmer && !reduce;

  const glyphRef = useRef(null);
  const breathRef = useRef(null);
  const timerRef = useRef(null);
  const stackRef = useRef(null);
  const workRef = useRef(null);
  const doneRef = useRef(null);
  const dsRef = useRef(0);
  const prevWorking = useRef(isWorking);
  const latest = useRef({});
  latest.current = { onSettle };
  const [announce, setAnnounce] = useState(label);

  useEffect(() => {
    if (working) setAutoSettled(false);
  }, [working]);

  useEffect(() => {
    if (isWorking) setOpen(true);
    else if (collapseOnSettle) setOpen(false);
  }, [isWorking, collapseOnSettle]);

  useEffect(() => {
    const glyphEl = glyphRef.current;
    if (!glyphEl) return;
    glyphEl.style.transition = `opacity ${settleDuration}ms ease`;
    glyphEl.style.opacity = isWorking ? '1' : `${GLYPH_DONE}`;
  }, [isWorking, settleDuration]);

  const paint = ds => {
    dsRef.current = ds;
    if (timerRef.current) timerRef.current.textContent = fmt(ds);
  };

  useLayoutEffect(() => {
    if (elapsed != null) {
      paint(Math.round(elapsed * 10));
      return undefined;
    }
    if (!isWorking) return undefined;
    const startedAt = performance.now();
    paint(0);
    const id = setInterval(() => {
      const ds = Math.floor((performance.now() - startedAt) / 100);
      paint(ds);
      if (settleAfter > 0 && ds >= Math.round(settleAfter * 10)) setAutoSettled(true);
    }, 100);
    return () => clearInterval(id);
  }, [isWorking, elapsed, settleAfter]);

  useLayoutEffect(() => {
    const t = timerRef.current;
    const stack = stackRef.current;
    if (!t || !stack) return undefined;
    const place = glide => {
      const active = isWorking ? workRef.current : doneRef.current;
      if (!active) return;
      const shift = active.offsetWidth - stack.offsetWidth;
      if (!glide) t.style.transition = 'none';
      t.style.transform = `translateX(${shift}px)`;
      if (!glide) {
        void t.offsetWidth;
        t.style.transition = '';
      }
    };
    place(prevWorking.current !== isWorking);
    prevWorking.current = isWorking;
    const ro = new ResizeObserver(() => place(false));
    if (workRef.current) ro.observe(workRef.current);
    if (doneRef.current) ro.observe(doneRef.current);
    return () => ro.disconnect();
  }, [isWorking, label, doneText, fontSize, showTimer]);

  useEffect(() => {
    if (isWorking) {
      setAnnounce(label);
      return;
    }
    setAnnounce(showTimer ? `${doneText} ${spoken(dsRef.current)}` : doneText);
    latest.current.onSettle?.(dsRef.current / 10);
  }, [isWorking, doneText, label, showTimer]);

  const toggle = hasTrace && collapsible;
  const head = (
    <>
      {glyph !== 'none' ? (
        <span ref={glyphRef} className="thought-line__glyph" aria-hidden="true">
          {glyph === 'sparkle' ? (
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c0 4.5-3.5 8-8 8 4.5 0 8 3.5 8 8 0-4.5 3.5-8 8-8-4.5 0-8-3.5-8-8z" />
              <path d="M19 3v4M21 5h-4" />
            </svg>
          ) : glyph === 'dot' ? (
            <span className="thought-line__dot" />
          ) : (
            glyph
          )}
        </span>
      ) : null}
      <span ref={stackRef} className="thought-line__label" aria-hidden="true">
        <span ref={workRef} className="thought-line__text" data-active={isWorking ? '' : undefined}>
          <span ref={breathRef} className="thought-line__breath" data-shimmer={sheen ? '' : undefined}>
            {renderLabel ? renderLabel(label, true) : label}
          </span>
        </span>
        <span
          ref={doneRef}
          className="thought-line__text thought-line__text--done"
          data-active={isWorking ? undefined : ''}
        >
          {renderLabel ? renderLabel(doneText, false) : doneText}
        </span>
      </span>
      {showTimer ? (
        <span ref={timerRef} className="thought-line__timer" data-done={isWorking ? undefined : ''} aria-hidden="true">
          0.0s
        </span>
      ) : null}
      {collapsible ? (
        <span className="thought-line__chevron" data-on={hasTrace ? '' : undefined} aria-hidden="true">
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      ) : null}
      <span className="thought-line__sr" role="status">
        {announce}
      </span>
    </>
  );

  return (
    <div
      className={`thought-line${className ? ` ${className}` : ''}`}
      data-working={isWorking ? '' : undefined}
      data-open={open && hasTrace ? '' : undefined}
      style={{
        '--tl-font': `${fontSize}px`,
        '--tl-color': color,
        '--tl-glyph': glyphColor || color,
        '--tl-settle': `${settleDuration}ms`,
        '--tl-blur': `${settleBlur}px`,
        '--tl-shimmer': `${shimmerDuration}s`,
        ...style
      }}
    >
      {collapsible ? (
        <button
          type="button"
          className="thought-line__head"
          data-toggle={toggle ? '' : undefined}
          aria-expanded={toggle ? open : undefined}
          tabIndex={toggle ? 0 : -1}
          onClick={() => {
            if (toggle) setOpen(v => !v);
          }}
        >
          {head}
        </button>
      ) : (
        <div className="thought-line__head">{head}</div>
      )}
      {hasTrace ? (
        <div className="thought-line__trace" data-open={open ? '' : undefined} aria-hidden={!open}>
          <div className="thought-line__fold">
            <div className="thought-line__steps">
              {steps.map((text, i) => {
                const done = !isWorking || i < steps.length - 1;
                return (
                  <div key={`${i}-${text}`} className="thought-line__step" data-done={done ? '' : undefined}>
                    <span className="thought-line__mark" aria-hidden="true">
                      {done ? (
                        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <i className="thought-line__pulse" />
                      )}
                    </span>
                    <span className="thought-line__step-text">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
