import { LANDING_KEYFRAMES } from '@/components/landing/animations'
import { StickyNav } from '@/components/landing/StickyNav'
import { HeroSection } from '@/components/landing/HeroSection'
import { LogoBar } from '@/components/landing/LogoBar'
import { StatsCounter } from '@/components/landing/StatsCounter'
import { ModulesShowcase } from '@/components/landing/ModulesShowcase'
import { IaSpotlight } from '@/components/landing/IaSpotlight'
import { PointageSpotlight } from '@/components/landing/PointageSpotlight'
import { ConformiteSpotlight } from '@/components/landing/ConformiteSpotlight'
import { ComparisonTable } from '@/components/landing/ComparisonTable'
import { TestimonialCards } from '@/components/landing/TestimonialCards'
import { PricingTable } from '@/components/landing/PricingTable'
import { FaqAccordion } from '@/components/landing/FaqAccordion'
import { FooterCta } from '@/components/landing/FooterCta'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { AI_FEATURES_ENABLED } from '@/lib/features'

/**
 * Imaro landing page — "Moroccan fintech editorial" edition.
 *
 * Deliberate light↔dark rhythm: warm off-white content bands punctuated by
 * deep-navy authority bands (Hero, IA, Conformité, Footer CTA) so the page
 * never reads as a monotone slab. Every section reveals on scroll.
 *
 *   1. Sticky nav (transparent → frosted)
 *   2. Hero ............................ DARK navy
 *   3. Logo bar (marquee) .............. light
 *   4. Stats (animated counters) ....... light
 *   5. Modules bento (full surface) .... warm light
 *   6. IA spotlight .................... DARK navy
 *   7. Pointage spotlight .............. light
 *   8. Conformité Décret 2.23.700 ...... DARK navy
 *   9. Comparison Excel vs Imaro ....... light
 *  10. Testimonials .................... light
 *  11. Pricing ......................... light
 *  12. FAQ ............................. light
 *  13. Footer CTA ..................... DARK navy + footer
 */
export function HomePage() {
  return (
    <>
      <style>{LANDING_KEYFRAMES}</style>
      <div className="scroll-smooth bg-white dark:bg-background">
        <StickyNav />
        <HeroSection />
        <LogoBar />
        <StatsCounter />
        <ModulesShowcase />
        {/* Section IA masquée temporairement (KAN-111) */}
        {AI_FEATURES_ENABLED && <IaSpotlight />}
        <PointageSpotlight />
        <ConformiteSpotlight />
        <ComparisonTable />
        <TestimonialCards />
        <PricingTable />
        <FaqAccordion />
        <FooterCta />
        <LandingFooter />
      </div>
    </>
  )
}
