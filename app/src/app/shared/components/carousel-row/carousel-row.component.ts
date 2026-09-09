import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-carousel-row',
  standalone: true,
  imports: [CommonModule, LucideChevronLeft, LucideChevronRight],
  templateUrl: './carousel-row.component.html',
  styleUrls: ['./carousel-row.component.css'],
})
export class CarouselRowComponent implements AfterViewInit, OnDestroy {
  @Input() step = 0.8;

  @ViewChild('track') trackRef!: ElementRef<HTMLElement>;

  canScrollLeft = signal(false);
  canScrollRight = signal(false);

  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.updateEdges();

    this.resizeObserver = new ResizeObserver(() => this.updateEdges());
    this.resizeObserver.observe(this.trackRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  updateEdges(): void {
    const el = this.trackRef?.nativeElement;
    if (!el) return;

    this.canScrollLeft.set(el.scrollLeft > 1);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  scrollBy(direction: -1 | 1): void {
    const el = this.trackRef.nativeElement;
    el.scrollBy({ left: direction * el.clientWidth * this.step, behavior: 'smooth' });
  }
}
