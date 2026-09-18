import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { switchMap, takeUntil, catchError } from 'rxjs/operators';
import { MovieService } from '../../../core/services/movie.service';
import { SmoothScrollService } from '../../../core/services/smooth-scroll.service';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { CarouselRowComponent } from '../carousel-row/carousel-row.component';
import { PersonDetails, PersonCredit } from '../../../core/models/tmdb.models';
import { LucideX } from '@lucide/angular';

/** Talk show, jornalismo e reality: aparições, não trabalhos. */
const NON_ROLE_GENRES = new Set([10767, 10763, 10764]);

@Component({
  selector: 'app-person-modal',
  standalone: true,
  imports: [CommonModule, MovieCardComponent, CarouselRowComponent, LucideX],
  templateUrl: './person-modal.component.html',
})
export class PersonModalComponent implements OnDestroy {
  @Input({ required: true })
  set personId(value: number | null) {
    if (value == null) return;
    this.load$.next(value);
  }

  @Output() closed = new EventEmitter<void>();

  person = signal<PersonDetails | null>(null);
  isLoading = signal(true);

  private load$ = new Subject<number>();
  private destroy$ = new Subject<void>();
  private smoothScroll = inject(SmoothScrollService);

  constructor(private movieService: MovieService) {
    this.smoothScroll.stop();

    this.load$
      .pipe(
        switchMap((id) => {
          this.isLoading.set(true);
          this.person.set(null);
          return this.movieService.getPersonDetails(id).pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((person) => {
        this.person.set(person);
        this.isLoading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.smoothScroll.start();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  get profileUrl(): string {
    return this.movieService.getImageUrl(this.person()?.profile_path ?? null, 'w342');
  }

  /**
   * Filmografia ordenada por número de votos, não por popularidade: popularidade
   * na TMDB reflete acesso recente, e sobe talk show à frente de filme premiado.
   */
  knownFor = computed<PersonCredit[]>(() => {
    const credits = this.person()?.combined_credits?.cast ?? [];

    return credits
      .filter((c) => !(c.genre_ids ?? []).some((id) => NON_ROLE_GENRES.has(id)))
      .filter((c) => c.poster_path)
      .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      .slice(0, 15);
  });

  /** Idade atual, ou idade com que morreu. */
  age = computed<number | null>(() => {
    const birthday = this.person()?.birthday;
    if (!birthday) return null;

    const end = this.person()?.deathday ? new Date(this.person()!.deathday!) : new Date();
    const birth = new Date(birthday);

    let years = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) years--;

    return years;
  });

  get role(): string {
    const dept = this.person()?.known_for_department;
    const map: Record<string, string> = {
      Acting: 'Atuação',
      Directing: 'Direção',
      Writing: 'Roteiro',
      Production: 'Produção',
      Sound: 'Som',
      Camera: 'Fotografia',
      Editing: 'Montagem',
      Art: 'Direção de arte',
    };
    return dept ? map[dept] ?? dept : '';
  }

  getCreditTitle(credit: PersonCredit): string {
    return credit.title ?? credit.name ?? '';
  }

  getCreditYear(credit: PersonCredit): string {
    const date = credit.release_date || credit.first_air_date;
    return date ? String(new Date(date).getFullYear()) : '';
  }

  getCreditMediaType(credit: PersonCredit): 'movies' | 'series' {
    return credit.media_type === 'tv' ? 'series' : 'movies';
  }
}
