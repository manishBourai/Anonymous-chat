import { useState, type FormEvent } from 'react'

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [text, setText] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const next = text.trim()

    if (!next || disabled) {
      return
    }

    onSend(next)
    setText('')
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        maxLength={500}
        placeholder={disabled ? 'Waiting for a stranger...' : 'Say something nice.'}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  )
}
