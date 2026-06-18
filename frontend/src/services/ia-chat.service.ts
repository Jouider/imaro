import { api } from '@/lib/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type LegalCitation = {
  article: string
  loi: string
  excerpt: string
}

export type ChatReply = {
  content: string
  citations?: LegalCitation[]
}

// Backend contract (not yet available — see GitHub issue #198 for KAN-53):
//   POST /api/ia/chat
//   Body: { messages: ChatMessage[], residence_id?: number, language: string }
//   Response: ApiEnvelope<ChatReply>

// ─── Mock responses (dev only) ────────────────────────────────────────────────

const MOCK_REPLIES_FR: ChatReply[] = [
  {
    content:
      "Selon la **Loi 18-00** (art. 25), les pénalités de retard doivent être **votées en assemblée générale** avant d'être applicables. Une fois votées, elles s'appliquent dès le premier jour de retard après la période de grâce que vous aurez définie. Dans Imaro, configurez le taux et la période de grâce dans **Finances → Recouvrement → Configuration pénalités**.",
    citations: [
      {
        article: 'Article 25',
        loi: 'Loi 18-00',
        excerpt:
          'Les pénalités de retard doivent être votées en assemblée générale des copropriétaires avant leur application.',
      },
    ],
  },
  {
    content:
      'Le **Décret 2.23.700** impose 12 annexes réglementaires selon votre régime comptable :\n\n- **Régime simplifié** (≤ 200 000 MAD/an) : Annexes 10, 13-1, 13-2\n- **Régime normal** (200–500 k MAD) : Annexes 10 à 12\n- **Régime complet** (≥ 500 000 MAD) : Annexes 3 à 10\n\nGénérez-les depuis **Conformité → Annexes comptables** en un clic.',
    citations: [
      {
        article: 'Décret 2.23.700',
        loi: 'Décret 2.23.700',
        excerpt:
          'Les annexes réglementaires doivent être produites annuellement selon le seuil de charges de la copropriété.',
      },
    ],
  },
  {
    content:
      "La **Loi 18-00** (art. 16 quinquies) fixe un **délai minimum de 15 jours** entre la date d'envoi de la convocation et la date de l'assemblée générale. En cas de non-respect, les décisions prises peuvent être contestées en justice. Imaro vous avertit automatiquement si vous tentez de créer une AG avec un délai insuffisant.",
    citations: [
      {
        article: 'Article 16 quinquies',
        loi: 'Loi 18-00',
        excerpt:
          "La convocation à l'assemblée générale doit être envoyée au moins quinze jours avant la date de la réunion.",
      },
    ],
  },
  {
    content:
      "La clôture de l'exercice comptable se fait en 4 étapes dans Imaro :\n\n1. **Vérifier** que la balance est équilibrée (Débit = Crédit)\n2. **Contrôler** que les comptes de charges (cl. 6) et produits (cl. 7) sont mouvementés\n3. **Générer** les annexes réglementaires\n4. **Clôturer** depuis **Comptabilité → Clôture** — l'exercice sera verrouillé\n\nConformément au **Décret 2.23.700**, les documents doivent être conservés **7 ans** minimum.",
    citations: [
      {
        article: 'Décret 2.23.700',
        loi: 'Décret 2.23.700',
        excerpt:
          "Les pièces comptables et procès-verbaux d'assemblée doivent être conservés pendant une durée minimale de 7 ans.",
      },
    ],
  },
]

const MOCK_REPLIES_EN: ChatReply[] = [
  {
    content:
      'Under **Law 18-00** (art. 25), late-payment penalties must be **voted at a general meeting** before they can be applied. Once voted, they apply from the first day of delay after the grace period you define. In Imaro, configure the rate and grace period under **Finances → Collection → Penalty settings**.',
    citations: [
      {
        article: 'Article 25',
        loi: 'Law 18-00',
        excerpt:
          'Late-payment penalties must be voted at a general meeting of co-owners before application.',
      },
    ],
  },
  {
    content:
      '**Decree 2.23.700** requires 12 regulatory annexes depending on your accounting regime:\n\n- **Simplified** (≤ 200,000 MAD/year): Annexes 10, 13-1, 13-2\n- **Standard** (200–500k MAD): Annexes 10 to 12\n- **Full** (≥ 500,000 MAD): Annexes 3 to 10\n\nGenerate them from **Compliance → Accounting annexes** in one click.',
    citations: [
      {
        article: 'Decree 2.23.700',
        loi: 'Decree 2.23.700',
        excerpt:
          "Regulatory annexes must be produced annually according to the co-ownership's charge threshold.",
      },
    ],
  },
]

const MOCK_REPLIES_AR: ChatReply[] = [
  {
    content:
      'وفقاً للـ**قانون 18-00** (المادة 25)، يجب **التصويت على غرامات التأخير في الجمع العام** قبل تطبيقها. بمجرد التصويت، تُطبَّق من أول يوم تأخير بعد فترة السماح التي تحددها. في إيمارو، قم بإعداد النسبة وفترة السماح من **المالية ← التحصيل ← إعدادات الغرامات**.',
    citations: [
      {
        article: 'المادة 25',
        loi: 'القانون 18-00',
        excerpt:
          'يجب التصويت على غرامات التأخير في الجمع العام للملاك قبل تطبيقها.',
      },
    ],
  },
]

function getMockReply(lang: string): ChatReply {
  const pool =
    lang === 'ar'
      ? MOCK_REPLIES_AR
      : lang === 'en'
        ? MOCK_REPLIES_EN
        : MOCK_REPLIES_FR
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Simulated typing delay ───────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendChatMessage(
  messages: ChatMessage[],
  options: { residenceId?: number; language: string },
): Promise<ChatReply> {
  if (import.meta.env.DEV) {
    // Simulate network latency + streaming feel
    await sleep(900 + Math.random() * 600)
    return getMockReply(options.language)
  }

  // TODO: wire to POST /api/ia/chat once Abdellah ships the endpoint (KAN-53)
  const res = await api.post<{ data: ChatReply }>('/ia/chat', {
    messages,
    residence_id: options.residenceId,
    language: options.language,
  })
  return res.data.data
}
