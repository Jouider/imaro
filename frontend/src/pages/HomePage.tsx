import { LANDING_KEYFRAMES } from '@/components/landing/animations'
import { StickyNav } from '@/components/landing/StickyNav'
import { HeroSection } from '@/components/landing/HeroSection'
import { LogoBar } from '@/components/landing/LogoBar'
import { StatsCounter } from '@/components/landing/StatsCounter'
import { FeatureGrid } from '@/components/landing/FeatureGrid'
import { IaSpotlight } from '@/components/landing/IaSpotlight'
import { PointageSpotlight } from '@/components/landing/PointageSpotlight'
import { ComparisonTable } from '@/components/landing/ComparisonTable'
import { TestimonialCards } from '@/components/landing/TestimonialCards'
import { PricingTable } from '@/components/landing/PricingTable'
import { FaqAccordion } from '@/components/landing/FaqAccordion'
import { FooterCta } from '@/components/landing/FooterCta'
import { LandingFooter } from '@/components/landing/LandingFooter'

/**
 * Imaro landing page — Royal Blue Edition.
 *
 * 12 sections marketing-first :
 *   1. Sticky nav (transparent → frosted au scroll)
 *   2. Hero (h1 DM Serif + product mockup)
 *   3. Logo bar (marquee continu)
 *   4. Stats animées (4 KPIs)
 *   5. Features grid (6 cards)
 *   6. IA spotlight (score ring animé)
 *   7. Pointage spotlight (10 banques → match)
 *   8. Comparison Excel vs Imaro
 *   9. Testimonials (3 syndics)
 *  10. Pricing (3 plans, Pro featured)
 *  11. FAQ Accordion
 *  12. Footer CTA + LandingFooter
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
        <FeatureGrid />
        <IaSpotlight />
        <PointageSpotlight />
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
