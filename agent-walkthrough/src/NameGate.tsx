import React, { useState } from 'react'
import { Button, Modal, TextInput } from '@rdc-npm/rdc-ui-v4'
import { css } from 'styled-system/css'
import { vstack } from 'styled-system/patterns'
import { hasAgentFirstName, setAgentFirstName } from './agent'

// The way in. States plainly that this is a test prototype with made-up data, then asks for a
// first name, which personalizes the prototype ("Josh" becomes "Josh Agent").
// children is a render function so the app can hold back its own dialogs (which portal
// outside the blur and would compete with this one for focus) until the name is in.
export default function NameGate({ children }: { children: (locked: boolean) => React.ReactNode }) {
  const [ready, setReady] = useState(() => hasAgentFirstName())
  const [value, setValue] = useState('')
  const [empty, setEmpty] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (setAgentFirstName(value)) setReady(true)
    else setEmpty(true)
  }

  return (
    <>
      {/* The prototype renders underneath, blurred and unreachable, until the name is entered. The
          wrapper stays mounted either way so continuing doesn't reset the app. */}
      <div aria-hidden={!ready || undefined}
        className={ready ? undefined : css({ filter: 'auto', blur: '400', pointerEvents: 'none', userSelect: 'none' })}>
        {children(!ready)}
      </div>
      {/* No onClose: Escape and overlay clicks can't dismiss it. */}
      <Modal open={!ready} size="sm">
        <Modal.HeaderCustom className={css({ textStyle: 'headingMd', color: 'text.base', paddingX: '600', paddingTop: '600' })}>
          This is a prototype for testing
        </Modal.HeaderCustom>
        <form onSubmit={submit}>
          <Modal.Body>
            <div className={vstack({ alignItems: 'stretch', gap: '400', paddingY: '400' })}>
              <p className={css({ textStyle: 'bodyMd', color: 'text.base', fontWeight: 'semibold' })}>
                Nothing here is real.
              </p>
              <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>
                This prototype exists only to test a design idea. The agent, clients, homes, messages and tours are all made up, and nothing you do here is sent to anyone.
              </p>
              <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>
                We log which steps you view and tap so we can improve the design. We never record what you type, and your first name stays in your browser.
              </p>
              <TextInput label="First name" autoComplete="given-name" autoFocus value={value} maxLength={24}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setValue(e.target.value); setEmpty(false) }}
                helperText="We use it to personalize the prototype. For example, Josh becomes “Josh Agent”."
                error={empty} errorText="Enter your first name to continue." />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button styleType="Primary" size="sm" type="submit">Start the prototype</Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}
