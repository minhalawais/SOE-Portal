import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Fingerprint, HelpCircle, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { APP_CONFIG } from '@/app/config/app.config'
import { PoweredByFooter } from '@/components/layout/PoweredByFooter'
import { Button } from '@/design-system/components/Button'
import { useSessionStore } from '@/state/session'
import { getHomeForRole } from '@/permissions'
import { cn } from '@/utils'

type LoginStep = 'credentials' | 'mfa' | 'passkey' | 'recovery'

const inputClass = 'h-12 w-full rounded-control border border-soe-border bg-white px-3 text-sm text-soe-ink outline-none transition placeholder:text-[#94a3b8] focus:border-soe-blue focus:shadow-[var(--shadow-focus)]'

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-soe-ink">{children}</label>
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white shadow-sm', compact ? 'h-11 w-11 p-1.5' : 'h-14 w-14 p-2')}><img src="/images/MOIP Logo.png" alt="Ministry of Industries and Production" className="h-full w-full object-contain" /></div><div><p className={cn('font-semibold leading-tight', compact ? 'text-xs text-soe-navy' : 'text-sm text-white')}>Ministry of Industries & Production</p><p className={cn('mt-1 text-[11px]', compact ? 'text-soe-slate' : 'text-white/70')}>Government of Pakistan</p></div></div>
}

function AuthenticationHeader({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h1 className="text-[28px] font-bold text-soe-navy">{title}</h1><p className="mt-2 max-w-md text-sm leading-6 text-soe-slate">{description}</p></div>
}

export function LoginPage() {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const role = useSessionStore((state) => state.role)
  const signIn = useSessionStore((state) => state.signIn)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)

  if (isAuthenticated) return <Navigate to={getHomeForRole(role)} replace />

  const validEmail = /^\S+@\S+\.\S+$/.test(email)

  const continueWithCredentials = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!validEmail || password.length < 8) {
      setError('We could not sign you in with those details. Check your official email and password.')
      return
    }
    setStep('mfa')
  }

  const completeSignIn = () => {
    setWorking(true)
    window.setTimeout(() => {
      signIn(email)
      const nextRole = useSessionStore.getState().role
      navigate(getHomeForRole(nextRole), { replace: true })
    }, 450)
  }

  const verifyCode = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Enter the six-digit verification code from your authenticator.')
      return
    }
    completeSignIn()
  }

  const requestRecovery = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!validEmail) {
      setError('Enter your official email address to continue.')
      return
    }
    setRecoverySent(true)
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <main className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(430px,0.75fr)] lg:overflow-hidden">
    <section className="relative hidden min-h-0 overflow-hidden lg:block" aria-label="Pakistan industrial infrastructure">
      <img src="/images/soe-login-industrial.png" alt="Pakistan industrial port, rail and manufacturing infrastructure" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-[rgba(8,34,52,0.62)]" />
      <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
        <BrandLockup />
        <div className="mt-auto max-w-[660px] pb-10"><div className="mb-5 h-1 w-14 bg-soe-teal" /><p className="text-xs font-semibold uppercase text-white/75">SOE-GAIP</p><h2 className="mt-3 max-w-[620px] font-bold leading-[1.12] text-white"><span className="block text-[40px] xl:text-[42px]">State-Owned Enterprises</span><span className="mt-1 block text-[32px] xl:text-[36px]">Governance and Intelligence Portal</span></h2><p className="mt-5 max-w-[590px] text-base leading-7 text-white/78">Secure reporting, regulatory review and decision intelligence for state-owned enterprises.</p></div>
      </div>
    </section>

    <section className="flex min-h-0 flex-1 flex-col bg-white lg:overflow-y-auto">
      <div className="border-b border-soe-border px-5 py-4 lg:hidden"><BrandLockup compact /></div>
      <div className="flex flex-1 items-center px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[430px]">
          <div className="mb-8 hidden lg:block"><p className="text-xl font-bold uppercase text-soe-blue">{APP_CONFIG.APP_NAME}</p><p className="mt-1 text-xs text-soe-slate">Governance, Asset & Performance Intelligence</p></div>

          {step === 'credentials' ? <>
            <AuthenticationHeader title="Sign in" description="Access governance, asset, and performance tools for your state-owned enterprise." />
            {error ? <div role="alert" className="mb-4 border-l-4 border-soe-critical bg-[var(--color-critical-soft)] px-4 py-3 text-sm text-soe-ink">{error}</div> : null}
            <form onSubmit={continueWithCredentials} noValidate>
              <div className="mb-4"><FieldLabel htmlFor="official-email">Official email address</FieldLabel><div className="relative"><Mail aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-soe-slate" /><input id="official-email" name="email" type="email" autoComplete="username" inputMode="email" className={cn(inputClass, 'pl-10')} placeholder="name@organization.gov.pk" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus /></div></div>
              <div className="mb-3"><div className="flex items-center justify-between"><FieldLabel htmlFor="account-password">Password</FieldLabel><button type="button" className="mb-1.5 text-xs font-medium text-soe-blue hover:underline" onClick={() => { setError(''); setStep('recovery') }}>Forgot password?</button></div><div className="relative"><LockKeyhole aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-soe-slate" /><input id="account-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className={cn(inputClass, 'px-10')} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-soe-slate hover:bg-soe-canvas hover:text-soe-navy" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
              <label className="mb-5 flex items-center gap-2 text-xs text-soe-ink"><input type="checkbox" className="h-4 w-4 accent-soe-blue" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} />Keep me signed in on this trusted device</label>
              <Button type="submit" className="h-12 w-full">Sign in securely<ArrowRight size={17} /></Button>
            </form>
            <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-soe-border" /><span className="text-[11px] uppercase text-soe-slate">or</span><span className="h-px flex-1 bg-soe-border" /></div>
            <Button variant="secondary" className="h-12 w-full" onClick={() => { setError(''); setStep('passkey') }}><Fingerprint size={18} />Use a passkey or security key</Button>
          </> : null}

          {step === 'mfa' ? <>
            <button type="button" className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-soe-blue" onClick={() => { setError(''); setStep('credentials') }}><ArrowLeft size={14} />Back to sign in</button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[6px] bg-[var(--color-surface-teal)] text-soe-teal"><ShieldCheck size={24} /></div>
            <AuthenticationHeader title="Verify your identity" description={`Enter the six-digit code for ${email}. This additional step protects your authorized workspace.`} />
            {error ? <div role="alert" className="mb-4 border-l-4 border-soe-critical bg-[var(--color-critical-soft)] px-4 py-3 text-sm text-soe-ink">{error}</div> : null}
            <form onSubmit={verifyCode}><FieldLabel htmlFor="verification-code">Verification code</FieldLabel><input id="verification-code" name="verification-code" className={cn(inputClass, 'text-center font-mono text-xl tracking-[0.35em]')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /><Button type="submit" className="mt-5 h-12 w-full" loading={working}>Verify and continue<ArrowRight size={17} /></Button></form>
            <button type="button" className="mt-5 w-full text-center text-xs font-medium text-soe-blue hover:underline">Send a new code</button>
          </> : null}

          {step === 'passkey' ? <>
            <button type="button" className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-soe-blue" onClick={() => { setError(''); setStep('credentials') }}><ArrowLeft size={14} />Use password instead</button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[6px] bg-[var(--color-surface-teal)] text-soe-teal"><Fingerprint size={25} /></div>
            <AuthenticationHeader title="Use your passkey" description="Authenticate with the passkey, biometric or security key registered to your official account." />
            {error ? <div role="alert" className="mb-4 border-l-4 border-soe-critical bg-[var(--color-critical-soft)] px-4 py-3 text-sm text-soe-ink">{error}</div> : null}
            <div className="mb-5"><FieldLabel htmlFor="passkey-email">Official email address</FieldLabel><input id="passkey-email" type="email" autoComplete="username webauthn" className={inputClass} placeholder="name@organization.gov.pk" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <Button className="h-12 w-full" loading={working} onClick={() => { if (!validEmail) { setError('Enter your official email address to locate your registered passkey.'); return } completeSignIn() }}><Fingerprint size={18} />Continue with passkey</Button>
            <p className="mt-5 text-xs leading-5 text-soe-slate">Your browser or security key will ask you to confirm your identity. Biometric information remains on your device.</p>
          </> : null}

          {step === 'recovery' ? <>
            <button type="button" className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-soe-blue" onClick={() => { setError(''); setRecoverySent(false); setStep('credentials') }}><ArrowLeft size={14} />Back to sign in</button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[6px] bg-soe-canvas text-soe-blue">{recoverySent ? <CheckCircle2 size={24} /> : <KeyRound size={24} />}</div>
            <AuthenticationHeader title={recoverySent ? 'Check your email' : 'Reset your password'} description={recoverySent ? 'If the account is active, a secure reset link has been sent to the official email address provided.' : 'Enter your official email address. We will send a time-limited password reset link if the account is active.'} />
            {!recoverySent ? <form onSubmit={requestRecovery}>{error ? <div role="alert" className="mb-4 border-l-4 border-soe-critical bg-[var(--color-critical-soft)] px-4 py-3 text-sm text-soe-ink">{error}</div> : null}<FieldLabel htmlFor="recovery-email">Official email address</FieldLabel><input id="recovery-email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} autoFocus /><Button type="submit" className="mt-5 h-12 w-full">Send secure reset link</Button></form> : <Button variant="secondary" className="h-12 w-full" onClick={() => { setRecoverySent(false); setStep('credentials') }}>Return to sign in</Button>}
          </> : null}

        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-soe-border px-5 py-4 text-[11px] text-soe-slate sm:px-10 lg:px-12 xl:px-16"><span>© 2026 Ministry of Industries & Production</span><div className="flex gap-4"><a href="mailto:support@moip.gov.pk" className="inline-flex items-center gap-1 hover:text-soe-blue"><HelpCircle size={13} />Support</a></div></footer>
    </section>
      </main>
      <PoweredByFooter />
    </div>
  )
}
