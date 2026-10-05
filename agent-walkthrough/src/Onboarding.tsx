import React, { useEffect, useRef } from 'react'
import { Avatar, Button, Modal, Tag } from '@rdc-npm/rdc-ui-v4'
import { IconCheck, IconChevronDown, IconChevronUp } from '@rdc-npm/rdc-ui-v4/illustrations'
import { css } from 'styled-system/css'
import { circle, hstack, vstack } from 'styled-system/patterns'
import { TOURS, type TourId } from './tours'

// ─── Welcome dialog ───────────────────────────────────────────────────────────
// Shown once on first run. The agent signed in through their MLS, so everything
// here is read-only: no profile, license, or service-area inputs anywhere.

export type Agent = {
  name: string; firstName: string; initials: string; brokerage: string; license: string; serviceArea: string
}

export function WelcomeDialog({ open, agent, onExplore, onTour }: {
  open: boolean; agent: Agent; onExplore: () => void; onTour: () => void
}) {
  return (
    <Modal open={open} onClose={onExplore} width="480px">
      {/* HeaderCustom renders the dialog title element itself, so the text goes straight in. */}
      <Modal.HeaderCustom className={css({ px: '600', pt: '600', fontSize: '[24px]', lineHeight: '[30px]', fontWeight: 'bold', color: 'text.base' })}>
        Welcome to Realtor.com+, {agent.firstName}
      </Modal.HeaderCustom>
      <Modal.Body>
        <div className={vstack({ alignItems: 'stretch', gap: '500', py: '400' })}>
          <p className={css({ fontSize: '[14px]', lineHeight: '[20px]', color: 'text.alternate' })}>
            You signed in with your MLS, so your profile is ready. Take a quick look around before your clients join.
          </p>

          <div className={vstack({ alignItems: 'stretch', gap: '0', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '[12px]' })}>
            <div className={hstack({ gap: '300', p: '400' })}>
              <Avatar size="sm" initials={agent.name.split(' ')} />
              <div className={vstack({ alignItems: 'flex-start', gap: '0', flex: '1', minW: '0' })}>
                <p className={css({ fontSize: '[14px]', lineHeight: '[20px]', fontWeight: 'semibold', color: 'text.base' })}>{agent.name}</p>
                <p className={css({ fontSize: '[13px]', lineHeight: '[18px]', color: 'text.alternate' })}>{agent.brokerage}</p>
              </div>
              <Tag dataColor="greenSubtle">From your MLS</Tag>
            </div>
            <dl className={vstack({ alignItems: 'stretch', gap: '0', m: '0' })}>
              {[['License', agent.license], ['Service area', agent.serviceArea]].map(([k, v]) => (
                <div key={k} className={hstack({ gap: '400', justifyContent: 'space-between', px: '400', py: '300', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })}>
                  <dt className={css({ fontSize: '[13px]', lineHeight: '[18px]', color: 'text.alternate' })}>{k}</dt>
                  <dd className={css({ fontSize: '[13px]', lineHeight: '[18px]', color: 'text.base', fontWeight: 'semibold', textAlign: 'right', m: '0' })}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={hstack({ gap: '300', p: '400', bg: 'bg.alternate', borderRadius: '[12px]', alignItems: 'flex-start' })}>
            <Avatar size="xs" initials={['Alex', 'Rivera']} />
            <p className={css({ fontSize: '[14px]', lineHeight: '[20px]', color: 'text.base' })}>
              We added <strong>Alex Rivera</strong>, a sample client, so you can try chat and tours without reaching a real person.
            </p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={css({ flex: '1' })} />
        <Button styleType="Tertiary" size="sm" onClick={onExplore}>Explore on my own</Button>
        <Button styleType="Primary" size="sm" onClick={onTour}>Show me around</Button>
      </Modal.Footer>
    </Modal>
  )
}

// ─── Floating tour list (the onboarding hub) ──────────────────────────────────

// A conic-gradient ring with "{done}/{total}" inside. The pill reuses it smaller.
function Ring({ done, total, size = 36 }: { done: number; total: number; size?: number }) {
  const deg = Math.round((done / total) * 360)
  return (
    <span
      aria-hidden
      className={css({ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', borderRadius: 'circle' })}
      style={{ width: size, height: size, background: `conic-gradient(var(--colors-status-success) ${deg}deg, var(--colors-border-base) 0)` }}
    >
      <span
        className={css({ position: 'absolute', inset: '[3px]', borderRadius: 'circle', bg: 'bg.base', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'semibold', color: 'text.base', whiteSpace: 'nowrap' })}
        style={{ fontSize: size >= 36 ? 11 : 9, lineHeight: 1 }}
      >
        {done}/{total}
      </span>
    </span>
  )
}

function StatusCircle({ n, done, next }: { n: number; done: boolean; next: boolean }) {
  if (done) {
    return (
      <span aria-hidden className={circle({ size: '24px', flexShrink: '0', bg: 'status.success', color: 'text.inverse' })}>
        <IconCheck size={1.5} />
      </span>
    )
  }
  return (
    <span aria-hidden className={circle({
      size: '24px', flexShrink: '0', borderWidth: '[2px]', borderStyle: 'solid',
      borderColor: next ? 'text.base' : 'border.base', fontSize: '[12px]', fontWeight: 'semibold', color: 'text.base',
    })}>{n}</span>
  )
}

export type ListCorner = 'bottom-right' | 'bottom-left'

export function TourList({
  expanded, done, corner, sheetWidth, focusKey, onStart, onMinimize, onExpand, onDismiss,
}: {
  expanded: boolean; done: Partial<Record<TourId, boolean>>; corner: ListCorner
  // Width of the open right-docked panel (0 when none), so the list never covers it.
  sheetWidth: number
  // Changes whenever the list should take focus (e.g. a tour just ended).
  focusKey: number
  onStart: (id: TourId) => void; onMinimize: () => void; onExpand: () => void; onDismiss: () => void
}) {
  const total = TOURS.length
  const doneCount = TOURS.filter(t => done[t.id]).length
  const next = TOURS.find(t => !done[t.id])
  const allDone = !next
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (focusKey && expanded) cardRef.current?.focus({ preventScroll: true }) }, [focusKey, expanded])

  // 24px inset; on the right it shifts left of an open docked panel so it never covers it.
  // On the left it sits just right of the 64px rail.
  const posStyle: React.CSSProperties = corner === 'bottom-left'
    ? { left: 64 + 24, bottom: 24 }
    : { right: sheetWidth + 24, bottom: 24 }
  const shell = css({
    position: 'fixed', zIndex: '[900]', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base',
    boxShadow: 'float', transition: '[right 220ms cubic-bezier(0.2,0.8,0.2,1)]',
  })

  if (!expanded) {
    return (
      <button
        type="button" onClick={onExpand} aria-label={`Getting started, ${doneCount} of ${total} tours done. Show tours`}
        className={`${shell} ${hstack({ gap: '300', h: '[48px]', pl: '[6px]', pr: '400', borderRadius: 'pill', cursor: 'pointer', fontFamily: 'inherit', color: 'text.base', _hover: { bg: 'bg.alternate' } })}`}
        style={posStyle}
      >
        <Ring done={doneCount} total={total} />
        <span className={css({ fontSize: '[14px]', fontWeight: 'semibold' })}>Getting started</span>
        <IconChevronUp size={2} />
      </button>
    )
  }

  return (
    <div
      ref={cardRef} tabIndex={-1} role="region" aria-label="Getting started tours"
      className={`${shell} ${css({ borderRadius: '[16px]', overflow: 'hidden', outline: 'none' })}`}
      style={{ ...posStyle, width: 352 }}
    >
      <div className={hstack({ gap: '300', p: '400', alignItems: 'center' })}>
        <Ring done={doneCount} total={total} />
        <div className={vstack({ alignItems: 'flex-start', gap: '0', flex: '1', minW: '0' })}>
          <p className={css({ fontSize: '[15px]', lineHeight: '[20px]', fontWeight: 'bold', color: 'text.base' })}>
            {allDone ? 'You’ve seen the essentials' : 'Get to know Realtor.com+'}
          </p>
          <p className={css({ fontSize: '[13px]', lineHeight: '[18px]', color: 'text.alternate' })}>
            {doneCount} of {total} tours done{next ? ` · Next: ${next.title}` : ''}
          </p>
        </div>
        <Button styleType="Ghost" size="sm" aria-label="Minimize" iconOnly={<IconChevronDown size={2} />} onClick={onMinimize} />
      </div>

      <ul className={css({ listStyle: 'none', m: '0', p: '0' })}>
        {TOURS.map((t, i) => {
          const isDone = !!done[t.id]
          const isNext = t.id === next?.id
          return (
            <li key={t.id} className={hstack({
              gap: '300', minH: '[44px]', px: '400', py: '200',
              borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base',
              bg: isNext ? 'bg.alternate' : 'transparent',
            })}>
              <StatusCircle n={i + 1} done={isDone} next={isNext} />
              <div className={vstack({ alignItems: 'flex-start', gap: '0', flex: '1', minW: '0' })}>
                <p className={css({ fontSize: '[14px]', lineHeight: '[20px]', color: 'text.base', fontWeight: isNext ? 'bold' : 'normal' })}>
                  {t.title}<span className={css({ srOnly: true })}>{isDone ? ' (done)' : ''}</span>
                </p>
                <p className={css({ fontSize: '[12px]', lineHeight: '[16px]', color: 'text.alternate' })}>{t.mins} · {t.stops.length} steps</p>
              </div>
              <Button
                styleType={isDone ? 'Ghost' : isNext ? 'Primary' : 'Tertiary'} size="sm"
                aria-label={`${isDone ? 'Replay' : 'Start'}: ${t.title}`} onClick={() => onStart(t.id)}
              >
                {isDone ? 'Replay' : 'Start'}
              </Button>
            </li>
          )
        })}
      </ul>

      {allDone && (
        <div className={hstack({ gap: '300', px: '400', py: '300', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })}>
          <p className={css({ flex: '1', fontSize: '[13px]', lineHeight: '[18px]', color: 'text.alternate' })}>Replay any tour from Support in the left rail.</p>
          <Button styleType="Primary" size="sm" onClick={onDismiss}>Dismiss</Button>
        </div>
      )}
    </div>
  )
}
