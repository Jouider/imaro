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
.l-d-100 { animation-delay: 0.1s; }
.l-d-200 { animation-delay: 0.2s; }
.l-d-300 { animation-delay: 0.3s; }
.l-d-400 { animation-delay: 0.4s; }
.l-d-500 { animation-delay: 0.5s; }
.l-d-700 { animation-delay: 0.7s; }
.l-d-900 { animation-delay: 0.9s; }

/* Scroll-reveal helper — apply with IntersectionObserver in component */
.l-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}
.l-reveal.l-shown {
  opacity: 1;
  transform: translateY(0);
}
`
