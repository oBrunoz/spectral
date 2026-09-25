import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  HostListener,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MovieService } from '../../../core/services/movie.service';
import { LoadingService } from '../../../core/services/loading.service';
import { AuthService } from '../../../core/services/auth.service';
import { MediaResult } from '../../../core/models/tmdb.models';
import { LucideSearch, LucideStar, LucideX } from '@lucide/angular';
import { MediaFallbackComponent } from '../media-fallback/media-fallback.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideSearch, LucideStar, LucideX, MediaFallbackComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  sidebarOpen = signal(false);
  isScrolled = signal(false);
  searchQuery = signal('');
  searchResults = signal<MediaResult[]>([]);
  showResults = signal(false);
  isSearching = signal(false);
  activeIndex = signal(-1);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('resultItem') resultItems?: QueryList<ElementRef<HTMLElement>>;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private movieService: MovieService,
    private router: Router,
    public loading: LoadingService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query.trim()) {
            this.searchResults.set([]);
            this.showResults.set(false);
            this.activeIndex.set(-1);
            return of(null);
          }
          this.isSearching.set(true);
          return this.movieService.searchMulti(query);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data) => {
          this.isSearching.set(false);
          if (data) {
            this.searchResults.set(
              data.results.filter((r: any) => r.title || r.name).slice(0, 8)
            );
            this.activeIndex.set(-1);
            this.showResults.set(true);
          }
        },
        error: () => this.isSearching.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sair(): void {
    this.closeSidebar();
    this.auth
      .sair()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => void this.router.navigateByUrl('/'));
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
    this.searchResults.set([]);
    this.showResults.set(false);
    this.activeIndex.set(-1);
    this.searchInput?.nativeElement.focus();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!this.showResults() || results.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (this.activeIndex() + step + results.length) % results.length;
      this.activeIndex.set(next);
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === 'Enter') {
      const active = results[this.activeIndex()];
      if (active) {
        event.preventDefault();
        this.navigateTo(active);
        this.searchInput?.nativeElement.blur();
      }
    }
  }

  private scrollActiveIntoView(): void {
    const item = this.resultItems?.get(this.activeIndex());
    item?.nativeElement.scrollIntoView({ block: 'nearest' });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim() && this.searchResults().length > 0) {
      this.showResults.set(true);
    }
  }

  onSearchBlur(): void {
    setTimeout(() => this.showResults.set(false), 150);
  }

  navigateTo(result: any): void {
    const type =
      result.media_type === 'movie'
        ? 'movies'
        : result.media_type === 'tv'
        ? 'series'
        : 'people';
    this.router.navigate(['/search', type, result.id]);
    this.showResults.set(false);
    this.searchQuery.set('');
  }

  getResultTitle(result: any): string {
    return result.title || result.name || result.original_name || result.original_title || '';
  }

  getResultYear(result: any): string {
    const date = result.release_date || result.first_air_date;
    return date ? String(new Date(date).getFullYear()) : '';
  }

  getResultType(result: any): string {
    if (result.media_type === 'movie') return 'Filme';
    if (result.media_type === 'tv') return 'Série';
    if (result.media_type === 'person') return 'Pessoa';
    return 'Outro';
  }

  getResultRating(result: any): number {
    return result.vote_average ?? 0;
  }

  getResultImage(result: any): string {
    const path = result.poster_path || result.profile_path || result.backdrop_path;
    return path ? `https://image.tmdb.org/t/p/w92${path}` : '';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 80);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen.set(false);
    this.showResults.set(false);
    this.activeIndex.set(-1);
    this.searchInput?.nativeElement.blur();
  }

  /** "/" foca a busca, como em sites de catálogo. */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

    event.preventDefault();
    this.searchInput?.nativeElement.focus();
  }
}
