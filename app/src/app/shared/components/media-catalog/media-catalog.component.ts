import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
  NgZone,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { MovieService } from '../../../core/services/movie.service';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { HeroSectionComponent } from '../hero-section/hero-section.component';
import { Genre, Movie, TvShow, Spotlight } from '../../../core/models/tmdb.models';
import { LucideChevronDown, LucideCheck } from '@lucide/angular';

type CatalogItem = Movie & TvShow;

// Página de catálogo (filmes ou séries): destaque no topo, filtro de gênero e grid.
@Component({
  selector: 'app-media-catalog',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MovieCardComponent,
    HeroSectionComponent,
    LucideChevronDown,
    LucideCheck,
  ],
  templateUrl: './media-catalog.component.html',
})
export class MediaCatalogComponent implements OnInit, OnDestroy {
  @Input({ required: true }) type: 'movie' | 'tv' = 'movie';
  // Título da seção quando nenhum gênero está selecionado.
  @Input() heading = '';

  genres = signal<Genre[]>([]);
  selectedGenreId = signal<number | null>(null);
  items = signal<CatalogItem[]>([]);
  spotlight = signal<Spotlight | null>(null);

  isGenreMenuOpen = signal(false);
  isBarVisible = signal(true);
  isBarSolid = signal(false);
  isLoading = signal(true);
  isLoadingMore = signal(false);
  isLoadingSpotlight = signal(true);
  hasError = signal(false);

  skeletonItems = Array(20).fill(0);
  moreSkeletonItems = Array(5).fill(0);

  private page = signal(1);
  private totalPages = signal(1);
  private destroy$ = new Subject<void>();
  private lastScrollY = 0;
  private observer?: IntersectionObserver;

  // A sentinela só existe no DOM enquanto houver próxima página, então o
  @ViewChild('sentinel')
  set sentinel(el: ElementRef<HTMLElement> | undefined) {
    this.observer?.disconnect();
    if (!el) return;

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) this.zone.run(() => this.loadMore());
        },
        // Antecipa o carregamento para o grid não chegar a mostrar o fim
        { rootMargin: '600px 0px' }
      );
      this.observer.observe(el.nativeElement);
    });
  }

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute,
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  /** Fecha o dropdown ao clicar fora dele. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isGenreMenuOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isGenreMenuOpen.set(false);
    }
  }

  // A barra recua ao descer e volta ao subir. Sobre o hero ela fica sempre
  // visível e transparente; só ganha fundo quando passa a cobrir o grid.
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const y = window.scrollY;
    const delta = y - this.lastScrollY;

    this.isBarSolid.set(y > window.innerHeight - 128);

    if (Math.abs(delta) > 6) {
      this.isBarVisible.set(y < 120 || delta < 0);
      this.lastScrollY = y;
    }

    if (!this.isBarVisible()) this.isGenreMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isGenreMenuOpen.set(false);
  }

  get mediaType(): 'movies' | 'series' {
    return this.type === 'movie' ? 'movies' : 'series';
  }

  selectedGenre = computed(() =>
    this.genres().find((g) => g.id === this.selectedGenreId()) ?? null
  );

  sectionTitle = computed(() => this.selectedGenre()?.name ?? this.heading);

  canLoadMore = computed(() => this.page() < this.totalPages());

  ngOnInit(): void {
    this.movieService
      .getGenres(this.type)
      .pipe(takeUntil(this.destroy$))
      .subscribe((genres) => this.genres.set(genres));

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const raw = params.get('genero');
      const genreId = raw ? Number(raw) : null;
      this.selectedGenreId.set(Number.isFinite(genreId) && genreId ? genreId : null);
      this.loadFirstPage();
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleGenreMenu(): void {
    this.isGenreMenuOpen.update((open) => !open);
  }

  selectGenre(genreId: number | null): void {
    this.isGenreMenuOpen.set(false);
    if (genreId === this.selectedGenreId()) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { genero: genreId },
      queryParamsHandling: 'merge',
    });
  }

  loadMore(): void {
    if (!this.canLoadMore() || this.isLoadingMore()) return;

    const next = this.page() + 1;
    this.isLoadingMore.set(true);

    this.movieService
      .discover<CatalogItem>(this.type, { genreId: this.selectedGenreId(), page: next })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.items.update((current) => [...current, ...data.results]);
          this.page.set(data.page);
          this.isLoadingMore.set(false);
        },
        error: () => this.isLoadingMore.set(false),
      });
  }

  retry(): void {
    this.loadFirstPage();
  }

  private loadFirstPage(): void {
    this.isLoading.set(true);
    this.isLoadingSpotlight.set(true);
    this.hasError.set(false);
    this.items.set([]);
    this.spotlight.set(null);

    this.movieService
      .discover<CatalogItem>(this.type, { genreId: this.selectedGenreId(), page: 1 })
      .pipe(
        takeUntil(this.destroy$),
        switchMap((data) => {
          this.items.set(data.results);
          this.page.set(data.page);
          this.totalPages.set(Math.min(data.total_pages, 500));
          this.isLoading.set(false);

          // O destaque é o primeiro da lista — muda junto com o gênero.
          const top = data.results[0];
          if (!top) return of(null);

          return this.movieService.getSpotlight(top.id, this.type).pipe(
            catchError(() => of(null))
          );
        }),
        map((spot) => spot)
      )
      .subscribe({
        next: (spot) => {
          this.spotlight.set(spot);
          this.isLoadingSpotlight.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.isLoadingSpotlight.set(false);
          this.hasError.set(true);
        },
      });
  }

  get spotlightRuntime(): string {
    const minutes = this.spotlight()?.runtime;
    if (!minutes) return '';
    return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  }

  get spotlightRoute(): unknown[] | null {
    const id = this.spotlight()?.id;
    return id ? ['/search', this.mediaType, id] : null;
  }

  getTitle(item: CatalogItem): string {
    return item.title ?? item.name ?? '';
  }

  getYear(item: CatalogItem): string {
    const date = this.type === 'movie' ? item.release_date : item.first_air_date;
    return date ? String(new Date(date).getFullYear()) : '';
  }
}
