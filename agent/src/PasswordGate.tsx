import React, { useState } from 'react'
import { Button, Modal, TextInput } from '@rdc-npm/rdc-ui-v4'
import { css } from 'styled-system/css'
import { vstack } from 'styled-system/patterns'

// Lightweight access gate for the shared GitHub Pages link. This is a client-side
// check only: the password ships in the JS bundle, so it keeps casual visitors out
// but is not real security. Unlock lasts for the browser tab's session.
const PASSWORD = 'B0bsYourUncle!'
const STORAGE_KEY = 'rdcplus-onboarding:unlocked'

// children is a render function so the app can hold back its own dialogs (which portal
// outside the blur and would compete with the gate for focus) until it's unlocked.
export default function PasswordGate({ children }: { children: (locked: boolean) => React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1')
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
    } else {
      setWrong(true)
    }
  }

  return (
    <>
      {/* The prototype renders underneath, blurred and unreachable, until unlocked. The
          wrapper stays mounted either way so unlocking doesn't reset the app. */}
      <div aria-hidden={!unlocked || undefined}
        className={unlocked ? undefined : css({ filter: 'auto', blur: '400', pointerEvents: 'none', userSelect: 'none' })}>
        {children(!unlocked)}
      </div>
      {/* No onClose: Escape and overlay clicks can't dismiss the gate. */}
      <Modal open={!unlocked} size="sm">
        <Modal.HeaderCustom className={css({ textStyle: 'headingMd', color: 'text.base', paddingX: '600', paddingTop: '600' })}>
          Enter password
        </Modal.HeaderCustom>
        <form onSubmit={submit}>
          <Modal.Body>
            <div className={vstack({ alignItems: 'stretch', gap: '400', paddingY: '400' })}>
              <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>
                This prototype is private. Enter the password to continue.
              </p>
              <TextInput label="Password" type="password" autoComplete="current-password" autoFocus value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setValue(e.target.value); setWrong(false) }}
                error={wrong} errorText="That password isn’t right. Try again." />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button styleType="Primary" size="sm" type="submit">Continue</Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}
