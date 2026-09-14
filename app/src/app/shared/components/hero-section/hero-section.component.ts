import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Genre } from '../../../core/models/tmdb.models';
import {
  LucideTriangleAlert,
  LucideRotateCcw,
  LucideStar,
  LucidePlay,
  LucidePlus,
  LucidePause,
  LucideInfo,
} from '@lucide/angular';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideTriangleAlert, LucideRotateCcw, LucideStar, LucidePlay, LucidePlus, LucidePause, LucideInfo],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css'
})
export class HeroSectionComponent {
  @Input() label = '';
  @Input() title = '';
  @Input() logoUrl = '';
  @Input() backgroundUrl = '';
  @Input() isLoading = false;
  @Input() hasError = false;
  @Input() rating?: number;
  @Input() releaseYear = '';
  @Input() runtime = '';
  @Input() tagline = '';
  @Input() genres: Genre[] = [];
  @Input() overview = '';
  @Input() trailerUrl = '#';
  
  @Input() detailsRoute: unknown[] | null = null;

  @Output() retryClicked = new EventEmitter<void>();
  @Output() addToListClicked = new EventEmitter<void>();

  @Output() trailerOpened = new EventEmitter<void>();
  @Output() trailerClosed = new EventEmitter<void>();

  @ViewChild('trailerPlayer') trailerPlayer?: ElementRef<HTMLIFrameElement>;

  isTrailerVisible = signal(false);
  isBgLoaded = signal(false);

  // controle do hint para fechar trailer
  isCloseHintVisible = signal(false);
  private closeHintTimer?: ReturnType<typeof setTimeout>;

  onBackgroundLoad(): void {
    this.isBgLoaded.set(true);
  }

  openTrailer(): void {
    if (!this.trailerUrl || this.trailerUrl === '#') return;
    this.isTrailerVisible.set(true);
    this.trailerOpened.emit();
    if (this.trailerPlayer) {
      this.trailerPlayer.nativeElement.src = `${this.trailerUrl}?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`;
    }

    this.isCloseHintVisible.set(true);
    clearTimeout(this.closeHintTimer);
    this.closeHintTimer = setTimeout(() => this.isCloseHintVisible.set(false), 3000);
  }

  closeTrailer(): void {
    this.trailerClosed.emit();
    this.isTrailerVisible.set(false);
    this.isCloseHintVisible.set(false);
    clearTimeout(this.closeHintTimer);
    if (this.trailerPlayer) {
      this.trailerPlayer.nativeElement.src = '';
    }
  }
}
