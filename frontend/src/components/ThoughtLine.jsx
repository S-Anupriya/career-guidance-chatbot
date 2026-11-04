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
  fontSize = 13.5,
  working = true,
  settleAfter = 0,
  elapsed,
  showTimer = true,
  onSettle,
  className = '',
  style
}) {
  const [autoSettled, setAutoSettled] = useState(false);
  const [open, setOpen] = useState(true);
  const isWorking = working && !autoSettled;
  const doneText = doneLabel || (showTimer ? 'Analysis complete' : 'Done thinking');
  const hasTrace = steps.length > 0;

  const glyphRef = useRef(null);
  const timerRef = useRef(null);
  const dsRef = useRef(0);
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
    glyphEl.style.transition = `opacity 250ms ease`;
    glyphEl.style.opacity = isWorking ? '1' : `${GLYPH_DONE}`;
  }, [isWorking]);

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

  useEffect(() => {
    if (isWorking) {
      setAnnounce(label);
      return;
    }
    setAnnounce(showTimer ? `${doneText} ${spoken(dsRef.current)}` : doneText);
    latest.current.onSettle?.(dsRef.current / 10);
  }, [isWorking, doneText, label, showTimer]);

  const toggle = hasTrace && collapsible;
  const currentLabelText = isWorking
    ? (renderLabel ? renderLabel(label, true) : label)
    : (renderLabel ? renderLabel(doneText, false) : doneText);

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
      <span className="thought-line__label" aria-hidden="true">
        <span className="thought-line__breath">
          {currentLabelText}
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
      <span className="thought-line__sr" aria-live="polite">
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
