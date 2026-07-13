/**
 * Feature flags — interrupteurs globaux de fonctionnalités.
 *
 * `AI_FEATURES_ENABLED` (KAN-111) : coupe TOUTES les surfaces IA (assistant
 * EMARO / chat, import IA de facture, suggestion de budget IA, mentions « IA »
 * du site vitrine). Désactivé pour l'instant — l'IA a un coût et on démarre.
 * Pour réactiver : repasser à `true` (aucune autre modification nécessaire, les
 * composants et services IA sont conservés, simplement masqués).
 *
 * Typé `boolean` volontairement (et non `false` littéral) pour que les gardes
 * JSX `AI_FEATURES_ENABLED && …` ne soient pas signalées comme conditions
 * toujours fausses par le linter.
 */
export const AI_FEATURES_ENABLED: boolean = false
