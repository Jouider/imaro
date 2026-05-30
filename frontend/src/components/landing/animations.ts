/**
 * Centralized animation keyframes for the landing page.
 * Injected once via <style> in HomePage to avoid duplication.
 */
export const LANDING_KEYFRAMES = `
@keyframes landing-fade-up {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes landing-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes landing-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
@keyframes landing-pulse-ring {
  0% { box-shadow: 0 0 0 0 rgb(29 78 216 / 0.4); }
  70% { box-shadow: 0 0 0 16px rgb(29 78 216 / 0); }
  100% { box-shadow: 0 0 0 0 rgb(29 78 216 / 0); }
}
@keyframes landing-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes landing-count {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes landing-spotlight {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}
@keyframes landing-aurora {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.55; }
  33%       { transform: translate3d(6%, -4%, 0) scale(1.12); opacity: 0.8; }
  66%       { transform: translate3d(-5%, 5%, 0) scale(0.95); opacity: 0.65; }
}
@keyframes landing-drift {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}
@keyframes landing-reveal-up {
  from { opacity: 0; transform: translateY(36px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes landing-tilt {
  0%, 100% { transform: rotate(-1deg) translateY(0); }
  50%       { transform: rotate(1deg) translateY(-6px); }
}
@keyframes landing-sheen {
  0%   { transform: translateX(-120%) skewX(-12deg); }
  60%, 100% { transform: translateX(220%) skewX(-12deg); }
}
@keyframes landing-dash {
  to { stroke-dashoffset: 0; }
}

.l-fade-up {
  animation: landing-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.l-fade-in {
  animation: landing-fade-in 0.6s ease both;
}
.l-float {
  animation: landing-float 4s ease-in-out infinite;
}
.l-pulse-ring {
  animation: landing-pulse-ring 2s ease-out infinite;
}
.l-marquee {
  animation: landing-marquee 25s linear infinite;
}
.l-aurora {
  animation: landing-aurora 14s ease-in-out infinite;
  will-change: transform, opacity;
}
.l-drift {
  background-size: 200% auto;
  animation: landing-drift 6s linear infinite;
}
.l-tilt {
  animation: landing-tilt 7s ease-in-out infinite;
}
.l-sheen::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 70%
  );
  transform: translateX(-120%) skewX(-12deg);
  animation: landing-sheen 4.5s ease-in-out infinite;
  pointer-events: none;
}
.l-d-100 { animation-delay: 0.1s; }
.l-d-200 { animation-delay: 0.2s; }
.l-d-300 { animation-delay: 0.3s; }
.l-d-400 { animation-delay: 0.4s; }
.l-d-500 { animation-delay: 0.5s; }
.l-d-700 { animation-delay: 0.7s; }
.l-d-900 { animation-delay: 0.9s; }

/* Scroll-reveal helper — apply with the useReveal hook in components */
.l-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--l-delay, 0s);
}
.l-reveal.l-shown {
  opacity: 1;
  transform: translateY(0);
}
/* Scale-in reveal variant for cards / tiles */
.l-reveal-scale {
  opacity: 0;
  transform: translateY(24px) scale(0.97);
  transition:
    opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--l-delay, 0s);
}
.l-reveal-scale.l-shown {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Respect reduced-motion: kill ambient loops + show revealed content as-is */
@media (prefers-reduced-motion: reduce) {
  .l-float, .l-pulse-ring, .l-marquee, .l-aurora, .l-drift, .l-tilt,
  .l-sheen::after {
    animation: none !important;
  }
  .l-reveal, .l-reveal-scale {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
`
