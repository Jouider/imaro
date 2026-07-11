import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  BookOpen,
  ChevronDown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  sendChatMessage,
  getAssistantFaq,
  type ChatMessage,
  type LegalCitation,
  type FaqItem,
} from '@/services/ia-chat.service'

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayMessage = ChatMessage & {
  id: string
  citations?: LegalCitation[]
  /** Références légales (FAQ EMARO, KAN-107). */
  refs?: string[]
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-label="…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-[var(--color-imaro-primary)]/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  )
}

// ─── Citation chip ────────────────────────────────────────────────────────────

function CitationChip({
  citation,
}: {
  citation: LegalCitation
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 px-2.5 py-1 text-[11px] font-medium text-[var(--color-imaro-primary)] transition-colors hover:bg-[var(--color-imaro-primary)]/10"
      >
        <BookOpen className="size-3 shrink-0" />
        <span>
          {citation.article} — {citation.loi}
        </span>
        <ChevronDown
          className={cn(
            'size-3 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <p className="mt-1.5 rounded-lg border border-[var(--color-imaro-primary)]/15 bg-[var(--color-imaro-primary)]/5 px-3 py-2 text-[11px] leading-relaxed text-[var(--color-imaro-text)] italic">
          « {citation.excerpt} »
        </p>
      )}
    </div>
  )
}

// ─── Simple markdown bold renderer ───────────────────────────────────────────

function MdContent({ text }: { text: string }) {
  // Render **bold** and newlines only — no external dep needed
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part === '\n') return <br key={i} />
        return part
      })}
    </span>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  citLabel,
}: {
  msg: DisplayMessage
  citLabel: string
}) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-[var(--color-imaro-primary)] text-white'
            : 'rounded-bl-sm bg-muted/60 text-foreground dark:bg-muted/30',
        )}
      >
        <MdContent text={msg.content} />
      </div>
      {!isUser &&
        msg.citations?.map((c, i) => (
          <CitationChip key={i} citation={c} label={citLabel} />
        ))}
      {!isUser && msg.refs && msg.refs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {msg.refs.map((ref, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full border border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 px-2.5 py-1 text-[11px] font-medium text-[var(--color-imaro-primary)]"
            >
              <BookOpen className="size-3 shrink-0" />
              {ref}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Suggestion pill ──────────────────────────────────────────────────────────

function SuggestionPill({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 px-3 py-2 text-left text-xs text-[var(--color-imaro-primary)] transition-colors hover:bg-[var(--color-imaro-primary)]/10 active:scale-[0.98]"
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiChatFab({ aboveNav = false }: { aboveNav?: boolean }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const lang = i18n.resolvedLanguage ?? 'fr'

  // FAQ EMARO — 4 réponses figées (KAN-107), chargées à l'ouverture du chat.
  const { data: faq = [] } = useQuery({
    queryKey: ['assistant-faq'],
    queryFn: () => getAssistantFaq(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)

    try {
      const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const reply = await sendChatMessage(history, { language: lang })
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply.content,
          citations: reply.citations,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: t('gestionnaire.aiChat.errorMsg'),
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  // Réponse figée instantanée à une des 4 questions clés (KAN-107) : on n'appelle
  // pas l'IA, on affiche directement la réponse autoritative + références légales.
  function answerFaq(item: FaqItem) {
    if (thinking) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: item.question },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: item.answer,
        refs: item.refs,
      },
    ])
  }

  function clearChat() {
    setMessages([])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Pills = les 4 questions clés de la FAQ EMARO si disponibles, sinon les
  // suggestions i18n historiques.
  const fallbackSuggestions = [
    t('gestionnaire.aiChat.suggestions.s1'),
    t('gestionnaire.aiChat.suggestions.s2'),
    t('gestionnaire.aiChat.suggestions.s3'),
    t('gestionnaire.aiChat.suggestions.s4'),
  ]

  const isEmpty = messages.length === 0

  return (
    <>
      {/* ── Backdrop (mobile) ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Chat drawer ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gestionnaire.aiChat.title')}
        className={cn(
          'fixed bottom-0 end-0 z-50 flex flex-col',
          // Size
          'w-full sm:w-[380px]',
          aboveNav
            ? 'h-[75svh] sm:h-[560px] sm:end-6'
            : 'h-[85svh] sm:h-[600px] sm:bottom-[88px] sm:end-6',
          // Shape
          'rounded-t-2xl sm:rounded-2xl',
          // Background + shadow
          'border bg-white shadow-2xl shadow-black/15 dark:bg-card',
          // Slide animation
          'transition-all duration-300 ease-out',
          open
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-3 rounded-t-2xl px-4 py-3.5 text-white"
          style={{
            background:
              'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)',
          }}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">
              {t('gestionnaire.aiChat.title')}
            </p>
            <p className="text-[11px] text-white/65 leading-tight">
              {t('gestionnaire.aiChat.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isEmpty && (
              <button
                type="button"
                onClick={clearChat}
                aria-label={t('gestionnaire.aiChat.clearChat')}
                title={t('gestionnaire.aiChat.clearChat')}
                className="flex size-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="flex size-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isEmpty ? (
            <div className="flex flex-col gap-4">
              {/* Welcome */}
              <div className="rounded-2xl rounded-bl-sm bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed text-foreground dark:bg-muted/30">
                <MdContent text={t('gestionnaire.aiChat.welcome')} />
              </div>
              {/* Suggestion pills — FAQ EMARO (KAN-107) si dispo */}
              <div className="grid grid-cols-1 gap-2">
                {faq.length > 0
                  ? faq.map((item) => (
                      <SuggestionPill
                        key={item.key}
                        label={item.question}
                        onClick={() => answerFaq(item)}
                      />
                    ))
                  : fallbackSuggestions.map((s, i) => (
                      <SuggestionPill
                        key={i}
                        label={s}
                        onClick={() => void send(s)}
                      />
                    ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                citLabel={t('gestionnaire.aiChat.legalRef')}
              />
            ))
          )}

          {/* Typing indicator */}
          {thinking && (
            <div className="flex items-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted/60 px-3.5 py-2.5 dark:bg-muted/30">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Disclaimer */}
        <p className="shrink-0 px-4 pb-1 text-center text-[10px] text-muted-foreground/60">
          {t('gestionnaire.aiChat.disclaimer')}
        </p>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex items-end gap-2 border-t px-3 py-3"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('gestionnaire.aiChat.placeholder')}
            disabled={thinking}
            className={cn(
              'flex-1 resize-none rounded-xl border bg-muted/30 px-3 py-2 text-sm',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/30',
              'disabled:opacity-50',
              'max-h-[100px] overflow-y-auto',
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label={t('gestionnaire.aiChat.send')}
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl transition-all',
              'bg-[var(--color-imaro-accent)] text-white shadow-sm',
              'hover:opacity-90 active:scale-95',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}
          >
            <Send className="size-4" />
          </button>
        </form>

        {/* Powered by */}
        <p className="shrink-0 pb-3 text-center text-[10px] text-muted-foreground/40">
          {t('gestionnaire.aiChat.poweredBy')}
        </p>
      </div>

      {/* ── FAB ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('gestionnaire.aiChat.title')}
        aria-expanded={open}
        className={cn(
          'fixed z-50 end-6',
          aboveNav ? '' : 'bottom-6',
          'flex size-10 items-center justify-center rounded-full',
          'text-white shadow-lg shadow-black/20',
          'transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95',
          open
            ? 'opacity-0 pointer-events-none scale-90'
            : 'opacity-100 scale-100',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-imaro-primary-light) 0%, var(--color-imaro-primary) 100%)',
          ...(aboveNav && {
            bottom: 'calc(var(--portail-nav-h) + 1rem)',
          }),
        }}
      >
        <Sparkles className="size-4" />
      </button>
    </>
  )
}
