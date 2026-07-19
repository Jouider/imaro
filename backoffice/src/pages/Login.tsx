import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  activate,
  login,
  twoFactorConfirm,
  twoFactorSetup,
  twoFactorVerify,
  type AuthStep,
} from '../lib/api'

const card = 'w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm'
const field =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary'
const button =
  'w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50'

/** Message d'erreur lisible, qu'il vienne de l'API ou d'un throw local. */
function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    ?.response?.data
  const firstValidation = res?.errors && Object.values(res.errors)[0]?.[0]
  return firstValidation ?? res?.message ?? (err as Error)?.message ?? 'Connexion impossible'
}

export function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<AuthStep | null>(null)
  const [loading, setLoading] = useState(false)

  // Étape 1 — identifiants
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Étape 2 — création du mot de passe
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Étapes 3/4 — 2FA
  const [code, setCode] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  // Dès qu'on entre en enrôlement, on demande le secret et on rend le QR.
  useEffect(() => {
    if (step?.step !== '2fa_setup') return
    let cancelled = false
    twoFactorSetup(step.enrollToken)
      .then(async (d) => {
        if (cancelled) return
        setSecret(d.secret)
        setQr(await QRCode.toDataURL(d.otpauth_url, { width: 200, margin: 1 }))
      })
      .catch((err) => !cancelled && toast.error(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [step])

  /** Exécute une action d'auth et avance dans le parcours. */
  async function run(action: () => Promise<AuthStep | 'finished'>) {
    setLoading(true)
    try {
      const next = await action()
      if (next === 'finished' || next.step === 'done') {
        navigate('/', { replace: true })
        return
      }
      setCode('')
      setStep(next)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    run(() => login(email, password))
  }

  const submitNewPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas.')
      return
    }
    run(() => activate(email, password, newPassword))
  }

  const submitEnrolment = (e: React.FormEvent) => {
    e.preventDefault()
    if (step?.step !== '2fa_setup') return
    run(async () => {
      const { recoveryCodes } = await twoFactorConfirm(step.enrollToken, code)
      // On affiche les codes de secours AVANT d'entrer : ils ne sont montrés qu'une fois.
      setRecoveryCodes(recoveryCodes)
      return 'finished' as const
    })
  }

  const submitVerification = (e: React.FormEvent) => {
    e.preventDefault()
    if (step?.step !== '2fa_verify') return
    run(async () => {
      await twoFactorVerify(step.challengeToken, code)
      return 'finished' as const
    })
  }

  const header = (title: string, subtitle: string) => (
    <div className="text-center">
      <h1 className="text-xl font-bold text-primary">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )

  const codeInput = (
    <input
      autoFocus
      inputMode="numeric"
      autoComplete="one-time-code"
      required
      value={code}
      onChange={(e) => setCode(e.target.value.trim())}
      placeholder="123456"
      className={`${field} text-center text-lg tracking-[0.3em]`}
    />
  )

  // Les codes de secours priment sur tout : on ne les remontre jamais.
  if (recoveryCodes) {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={card}>
          {header('Codes de secours', 'Notez-les maintenant — ils ne seront plus affichés')}
          <ul className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Chaque code ne fonctionne qu'une seule fois, en remplacement de votre application
            d'authentification si vous perdez votre téléphone.
          </p>
          <button className={button} onClick={() => navigate('/', { replace: true })}>
            J'ai noté mes codes — continuer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      {step?.step === 'first_login' ? (
        <form onSubmit={submitNewPassword} className={card}>
          {header('Première connexion', 'Choisissez votre mot de passe personnel')}
          <div className="space-y-1">
            <label className="text-sm font-medium">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={field}
            />
            <p className="text-xs text-slate-500">8 caractères minimum.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Confirmation</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={field}
            />
          </div>
          <button type="submit" disabled={loading} className={button}>
            {loading ? 'Enregistrement…' : 'Créer mon mot de passe'}
          </button>
        </form>
      ) : step?.step === '2fa_setup' ? (
        <form onSubmit={submitEnrolment} className={card}>
          {header('Sécurisez votre compte', 'La double authentification est obligatoire')}
          <p className="text-sm text-slate-600">
            Scannez ce QR code avec Google Authenticator, Authy ou 1Password, puis saisissez le
            code à 6 chiffres affiché.
          </p>
          <div className="flex justify-center">
            {qr ? (
              <img src={qr} alt="QR code d'enrôlement" className="rounded-lg border p-2" />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>
          {secret && (
            <p className="text-center text-xs text-slate-500">
              Saisie manuelle : <span className="font-mono">{secret}</span>
            </p>
          )}
          {codeInput}
          <button type="submit" disabled={loading || !qr} className={button}>
            {loading ? 'Vérification…' : 'Activer la double authentification'}
          </button>
        </form>
      ) : step?.step === '2fa_verify' ? (
        <form onSubmit={submitVerification} className={card}>
          {header('Vérification', 'Code à 6 chiffres de votre application')}
          {codeInput}
          <p className="text-xs text-slate-500">
            Téléphone perdu ? Saisissez ici l'un de vos codes de secours.
          </p>
          <button type="submit" disabled={loading} className={button}>
            {loading ? 'Vérification…' : 'Vérifier'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCredentials} className={card}>
          {header('imaro — Back-office', 'Espace Digitoyou')}
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </div>
          <button type="submit" disabled={loading} className={button}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      )}
    </div>
  )
}
