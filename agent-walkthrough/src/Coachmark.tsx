import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@rdc-npm/rdc-ui-v4'
import { IconClose, IconChevronRight } from '@rdc-npm/rdc-ui-v4/illustrations'
import { css } from 'styled-system/css'
import { hstack, vstack } from 'styled-system/patterns'
import type { Stop, Tour } from './tours'

// ─── Coachmark engine ─────────────────────────────────────────────────────────
// A spotlight cut-out around the stop's target plus a 320px popover beside it.
// The target is re-measured every 100ms (and on resize) so the spotlight follows
// sheet slides, tab switches, and other layout shifts. Four transparent blockers
// surround the cut-out: the page is only reachable through the hole, and the
// target itself is never covered.

const POP_W = 320
const GAP = 14
const PAD = 6
const MARGIN = 16
const MOTION = 'cubic-bezier(0.5, 0, 0.2, 1)'
// Non-token values from the spec: the warm-black scrim (text.base at 50%), the
// white focus ring, and the brand-red ring used when dimming is off.
const SPOT_DIM = '0 0 0 2px #FFFFFF, 0 0 0 9999px rgba(26,24,22,0.5)'
const SPOT_RING = '0 0 0 2px #D92228, 0 0 0 6px rgba(217,34,40,0.18)'

type Rect = { top: number; left: number; width: number; height: number }

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b
  return (['top', 'left', 'width', 'height'] as const).every(k => Math.abs(a[k] - b[k]) < 0.5)
}

function place(stop: Stop, r: Rect | null, h: number, vw: number, vh: number) {
  if (!r) return { top: Math.max(MARGIN, vh / 2 - h / 2), left: vw / 2 - POP_W / 2 }
  const R = { top: r.top - PAD, left: r.left - PAD, right: r.left + r.width + PAD, bottom: r.top + r.height + PAD, h: r.height + 2 * PAD }
  // Side placements align near the top of tall targets rather than their middle.
  const mid = R.top + Math.min((R.h - h) / 2, 96)
  let top: number, left: number
  switch (stop.place) {
    case 'right': left = R.right + GAP; top = mid; break
    case 'left': left = R.left - GAP - POP_W; top = mid; break
    case 'top': top = R.top - GAP - h; left = R.left; break
    case 'bottom-end': top = R.bottom + GAP; left = R.right - POP_W; break
    default: top = R.bottom + GAP; left = R.left
  }
  return {
    top: Math.round(Math.max(MARGIN, Math.min(top, vh - h - MARGIN))),
    left: Math.round(Math.max(MARGIN, Math.min(left, vw - POP_W - MARGIN))),
  }
}

export function Coachmark({
  tour, index, dim, conditionMet, onNext, onBack, onShowMe, onEnd,
}: {
  tour: Tour; index: number; dim: boolean; conditionMet: boolean
  onNext: () => void; onBack: () => void; onShowMe: () => void; onEnd: () => void
}) {
  const stop = tour.stops[index]
  const n = tour.stops.length
  const prev = tour.stops[index - 1]
  const reduced = usePrefersReducedMotion()
  const popRef = useRef<HTMLDivElement>(null)
  const [m, setM] = useState<{ rect: Rect | null; popH: number; vw: number; vh: number }>(
    { rect: null, popH: 220, vw: window.innerWidth, vh: window.innerHeight },
  )

  // Measure on an interval rather than observers: the target can be swapped out,
  // re-mounted, or slid by a sibling's width transition, and 100ms keeps up.
  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-tour="${stop.target}"]`)
      let rect: Rect | null = null
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width || r.height) rect = { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      const popH = popRef.current?.offsetHeight ?? 220
      setM(s => (sameRect(s.rect, rect) && s.popH === popH && s.vw === window.innerWidth && s.vh === window.innerHeight)
        ? s : { rect, popH, vw: window.innerWidth, vh: window.innerHeight })
    }
    measure()
    const t = window.setInterval(measure, 100)
    window.addEventListener('resize', measure)
    return () => { window.clearInterval(t); window.removeEventListener('resize', measure) }
  }, [stop.target])

  // Focus moves to the popover on every stop; Escape ends the tour.
  useEffect(() => { popRef.current?.focus({ preventScroll: true }) }, [tour.id, index])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onEnd() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onEnd])

  const action = !!stop.until
  const canBack = index > 0 && (!prev.until || !!prev.manual)
  const showNext = !action || !!stop.manual
  const nextDisabled = !!stop.manual && !conditionMet
  const last = index === n - 1
  const pos = place(stop, m.rect, m.popH, m.vw, m.vh)
  const transition = reduced ? 'none' : `top 300ms ${MOTION}, left 300ms ${MOTION}, width 300ms ${MOTION}, height 300ms ${MOTION}`

  let spot: Rect | null = null
  if (m.rect) {
    const top = Math.max(2, m.rect.top - PAD)
    const left = Math.max(2, m.rect.left - PAD)
    spot = { top, left, width: Math.min(m.rect.width + PAD * 2, m.vw - left - 2), height: Math.min(m.rect.height + PAD * 2, m.vh - top - 2) }
  }
  const titleId = `coach-title-${tour.id}-${index}`

  return (
    <>
      {/* Click blockers around the cut-out (or the whole page while the target is missing). */}
      {spot ? (
        <>
          <div className={blocker} style={{ top: 0, left: 0, right: 0, height: spot.top }} />
          <div className={blocker} style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
          <div className={blocker} style={{ top: spot.top, left: 0, width: spot.left, height: spot.height }} />
          <div className={blocker} style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }} />
        </>
      ) : (
        <div className={blocker} style={{ inset: 0, background: dim ? 'rgba(26,24,22,0.5)' : undefined }} />
      )}

      {/* Spotlight — a rounded cut-out whose giant shadow is the scrim. */}
      {spot && (
        <div
          aria-hidden
          className={css({ position: 'fixed', zIndex: '[1000]', borderRadius: '[12px]', pointerEvents: 'none' })}
          style={{ ...spot, boxShadow: dim ? SPOT_DIM : SPOT_RING, transition }}
        />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-body`}
        tabIndex={-1}
        className={vstack({
          position: 'fixed', zIndex: '[1001]', alignItems: 'stretch', gap: '300',
          bg: 'bg.base', borderRadius: '[12px]', boxShadow: 'dialog', p: '400', outline: 'none',
        })}
        style={{ width: POP_W, top: pos.top, left: pos.left, transition: reduced ? 'none' : `top 300ms ${MOTION}, left 300ms ${MOTION}` }}
      >
        <div className={hstack({ gap: '200', justifyContent: 'space-between' })}>
          <p className={css({ fontSize: '[12px]', lineHeight: '[16px]', color: 'text.alternate' })}>
            {tour.title} · {index + 1} of {n}
          </p>
          <Button styleType="Ghost" size="sm" aria-label="End tour" iconOnly={<IconClose size={2} />} onClick={onEnd} />
        </div>

        <div aria-hidden className={hstack({ gap: '100' })}>
          {tour.stops.map((_, k) => (
            <span key={k} className={css({ flex: '1', h: '[3px]', borderRadius: 'pill', bg: k <= index ? 'text.base' : 'border.base' })} />
          ))}
        </div>

        <div className={vstack({ alignItems: 'stretch', gap: '100' })}>
          <h2 id={titleId} className={css({ fontSize: '[16px]', lineHeight: '[22px]', fontWeight: 'bold', color: 'text.base' })}>{stop.title}</h2>
          <p id={`${titleId}-body`} className={css({ fontSize: '[14px]', lineHeight: '[20px]', color: 'text.alternate' })}>{stop.body}</p>
        </div>

        {action && stop.hint && !conditionMet && (
          <p className={hstack({ gap: '200', bg: 'bg.alternate', borderRadius: '200', px: '300', py: '200', fontSize: '[13px]', lineHeight: '[18px]', fontWeight: 'semibold', color: 'text.base' })}>
            <IconChevronRight size={2} />
            {stop.hint}
          </p>
        )}

        <div className={hstack({ gap: '200', pt: '100' })}>
          {canBack && <Button styleType="Tertiary" size="sm" onClick={onBack}>Back</Button>}
          <div className={css({ flex: '1' })} />
          {action && <Button styleType="Ghost" size="sm" onClick={onShowMe}>Show me</Button>}
          {showNext && (
            <Button styleType="Primary" size="sm" disabled={nextDisabled} onClick={onNext}>{last ? 'Done' : 'Next'}</Button>
          )}
        </div>
        <span aria-live="polite" className={css({ srOnly: true })}>{action && conditionMet ? 'Done. Moving on.' : ''}</span>
      </div>
    </>
  )
}

const blocker = css({ position: 'fixed', zIndex: '[999]', bg: 'transparent' })
