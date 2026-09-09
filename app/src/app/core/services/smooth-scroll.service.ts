import { Injectable, NgZone, inject, DestroyRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import Lenis from 'lenis';

@Injectable({ providedIn: 'root' })
export class SmoothScrollService {
  private zone = inject(NgZone);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private lenis?: Lenis;
  private rafId?: number;

  init(): void {
    if (this.lenis) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    this.lenis = new Lenis({
      duration: 1.1,
      // desaceleração exponencial: rápido no começo, assenta no fim
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    this.zone.runOutsideAngular(() => {
      const raf = (time: number) => {
        this.lenis?.raf(time);
        this.rafId = requestAnimationFrame(raf);
      };
      this.rafId = requestAnimationFrame(raf);
    });

    const sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.lenis?.scrollTo(0, { immediate: true });
      }
    });

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.destroy();
    });
  }

  scrollTo(target: string | number | HTMLElement, offset = -80): void {
    if (this.lenis) {
      this.lenis.scrollTo(target, { offset });
      return;
    }

    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
    this.lenis = undefined;
  }
}
