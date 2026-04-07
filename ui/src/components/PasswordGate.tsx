import { useState, type ReactNode } from 'react'

const STORAGE_KEY = 'easybudget-auth'
// SHA-256 of the password — never store plaintext in source
const HASH = '8f9ea42db8d4833a73ef089fd5a5e60ac7b1845ed0025f2a07a425523fbaf712'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isAuthed(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === 'true'
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isAuthed)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  if (authed) return <>{children}</>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setChecking(true)
    setError(false)
    const hash = await sha256(value.trim())
    if (hash === HASH) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
      setValue('')
    }
    setChecking(false)
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 w-80">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-800">EasyBudget</h1>
          <p className="text-xs text-slate-400 mt-1">Zadejte heslo pro přístup</p>
        </div>
        <input
          type="password"
          autoFocus
          placeholder="Heslo"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false) }}
          className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none transition-colors ${
            error
              ? 'border-red-300 bg-red-50 placeholder-red-300'
              : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
          }`}
        />
        {error && (
          <p className="text-xs text-red-500 mt-2">Špatné heslo</p>
        )}
        <button
          type="submit"
          disabled={checking || !value.trim()}
          className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {checking ? 'Ověřuji...' : 'Vstoupit'}
        </button>
      </form>
    </div>
  )
}
