import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MovieService } from '../../../core/services/movie.service';
import { MediaResult } from '../../../core/models/tmdb.models';
import {
  LucideX,
  LucideHouse,
  LucideClapperboard,
  LucideTv,
  LucideSearch,
  LucideUserPlus,
  LucideLogIn,
} from '@lucide/angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideX, LucideHouse, LucideClapperboard, LucideTv, LucideSearch, LucideUserPlus, LucideLogIn],
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

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private movieService: MovieService, private router: Router) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query.trim()) {
            this.searchResults.set([]);
            this.showResults.set(false);
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
            this.searchResults.set(data.results.filter((r: any) => r.title || r.name));
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

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSearchBlur(): void {
    setTimeout(() => this.showResults.set(false), 150);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
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
    if (result.media_type === 'movie') return '🎬 Filme';
    if (result.media_type === 'tv') return '📺 Série';
    if (result.media_type === 'person') return '👤 Pessoa';
    return '🎲 Outro';
  }

  getResultImage(result: any): string {
    const path = result.poster_path || result.profile_path || result.backdrop_path;
    return path
      ? `https://image.tmdb.org/t/p/w92${path}`
      : '/images/image_not_found.png';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 80);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen.set(false);
    this.showResults.set(false);
  }
}
