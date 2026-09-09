import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  progress = signal(0);
  visible = signal(false);

  private pending = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);

    const sub = router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.start();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.stop();
      }
    });

    destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this.clearTimers();
    });
  }

  start(): void {
    this.pending++;
    if (this.pending > 1) return;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.progress.set(8);
    this.visible.set(true);
    this.startTicker();
  }

  stop(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending > 0) return;

    this.stopTicker();
    this.progress.set(100);

    this.hideTimer = setTimeout(() => {
      this.visible.set(false);
      this.hideTimer = setTimeout(() => this.progress.set(0), 300);
    }, 350);
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const current = this.progress();
      if (current >= 90) return;
      const step = current < 40 ? 6 : current < 70 ? 3 : 1;
      this.progress.set(Math.min(90, current + Math.random() * step));
    }, 220);
  }

  private stopTicker(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private clearTimers(): void {
    this.stopTicker();
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }
}
