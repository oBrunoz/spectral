import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, switchMap, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MovieService } from '../../core/services/movie.service';
import { HeroSectionComponent } from '../../shared/components/hero-section/hero-section.component';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { CastCard, MappedCastMember } from '../../shared/components/cast-card/cast-card';
import { CarouselRowComponent } from '../../shared/components/carousel-row/carousel-row.component';
import { WatchProvidersComponent } from '../../shared/components/watch-providers/watch-providers.component';
import { ContentFactsComponent } from '../../shared/components/content-facts/content-facts.component';
import { SeasonListComponent } from '../../shared/components/season-list/season-list.component';
import { MediaGalleryComponent } from '../../shared/components/media-gallery/media-gallery.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import {
  ContentDetails,
  ImageBackdrop,
  MediaResult,
  Movie,
  Review,
  Season,
  TmdbListResponse,
  TvShow,
  Video,
  WatchProviderCountry,
} from '../../core/models/tmdb.models';
import { environment } from '../../../environments/environment';

export interface MappedSimilarItem {
  id: number;
  title: string;
  posterPath: string | null;
  year: string;
  rating: number;
  mediaType: 'movies' | 'series';
}

const REVIEWS_VAZIAS: TmdbListResponse<Review> = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeroSectionComponent,
    MovieCardComponent,
    CastCard,
    CarouselRowComponent,
    WatchProvidersComponent,
    ContentFactsComponent,
    SeasonListComponent,
    MediaGalleryComponent,
    ReviewCardComponent,
  ],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css'],
})
export class DetailsComponent implements OnInit, OnDestroy {
  details = signal<ContentDetails | null>(null);
  reviews = signal<Review[]>([]);
  contentType = signal<'movies' | 'series' | 'people'>('movies');
  trailerUrl = signal<string>('#');
  backgroundUrl = signal<string>('');
  logoUrl = signal<string>('');
  isLoading = signal(true);

  skeletonCast = Array(6).fill(0);
  skeletonSimilar = Array(6).fill(0);

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const type = params['content_type'] as 'movies' | 'series' | 'people';
          const id = Number(params['id']);
          this.contentType.set(type);
          this.isLoading.set(true);
          this.reviews.set([]);
          this.details.set(null);

          if (type !== 'movies' && type !== 'series') {
            return forkJoin({
              details: of(null as ContentDetails | null),
              reviews: of(REVIEWS_VAZIAS),
            });
          }

          const apiType = type === 'movies' ? 'movie' : 'tv';

          return forkJoin({
            details: this.movieService
              .getContentDetails(id, apiType)
              .pipe(catchError(() => of(null as ContentDetails | null))),
            reviews: this.movieService
              .getReviews(id, apiType)
              .pipe(catchError(() => of(REVIEWS_VAZIAS))),
          });
        })
      )
      .subscribe({
        next: ({ details, reviews }) => {
          this.details.set(details);
          this.reviews.set(reviews.results ?? []);
          this.trailerUrl.set(this.pickTrailerUrl(details));

          const backdrop =
            details?.images?.backdrops?.[0]?.file_path ?? details?.backdrop_path;
          this.backgroundUrl.set(
            backdrop ? `${environment.tmdbImageUrl}/original${backdrop}` : ''
          );

          const logo = this.pickLogo(details);
          this.logoUrl.set(logo ? `${environment.tmdbImageUrl}/original${logo}` : '');

          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Prioriza logo em português, depois inglês. */
  private pickLogo(details: ContentDetails | null): string | null {
    const logos = details?.images?.logos ?? [];
    const escolhido =
      logos.find((l) => l.iso_639_1 === 'pt') ??
      logos.find((l) => l.iso_639_1 === 'en') ??
      logos[0];
    return escolhido?.file_path ?? null;
  }

  /** Trailer em pt quando existir; senão qualquer trailer, senão teaser. */
  private pickTrailerUrl(details: ContentDetails | null): string {
    const videos = (details?.videos?.results ?? []).filter((v) => v.site === 'YouTube');
    const escolhido =
      videos.find((v) => v.type === 'Trailer' && v.iso_639_1 === 'pt') ??
      videos.find((v) => v.type === 'Trailer') ??
      videos.find((v) => v.type === 'Teaser');
    return escolhido ? `https://www.youtube.com/embed/${escolhido.key}` : '#';
  }

  apiType = computed<'movie' | 'tv'>(() =>
    this.contentType() === 'series' ? 'tv' : 'movie'
  );

  isSeries = computed(() => this.contentType() === 'series');

  get contentLabel(): string {
    const t = this.contentType();
    if (t === 'movies') return 'Filme';
    if (t === 'series') return 'Série';
    return 'Pessoa';
  }

  get title(): string {
    return this.details()?.title || this.details()?.name || '';
  }

  get releaseYear(): string {
    const date = this.details()?.release_date || this.details()?.first_air_date;
    return date ? String(new Date(date).getFullYear()) : '';
  }

  get runtime(): string {
    const d = this.details();
    if (!d) return '';
    if (this.contentType() === 'movies' && d.runtime) {
      return `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}min`;
    }
    if (this.contentType() === 'series') {
      if (d.number_of_seasons) {
        return `${d.number_of_seasons} temporada${d.number_of_seasons === 1 ? '' : 's'}`;
      }
      if (d.episode_run_time?.length) return `${d.episode_run_time[0]} min/ep`;
    }
    return '';
  }

  certification = computed(() => this.movieService.getCertification(this.details()));

  watchProviders = computed<WatchProviderCountry | null>(() =>
    this.movieService.getWatchProviders(this.details())
  );

  hasWatchProviders = computed(() => {
    const p = this.watchProviders();
    if (!p) return false;
    return !!(
      p.flatrate?.length ||
      p.free?.length ||
      p.ads?.length ||
      p.rent?.length ||
      p.buy?.length
    );
  });

  seasons = computed<Season[]>(() => this.details()?.seasons ?? []);

  videos = computed<Video[]>(() => this.details()?.videos?.results ?? []);
  backdrops = computed<ImageBackdrop[]>(() => this.details()?.images?.backdrops ?? []);
  posters = computed<ImageBackdrop[]>(() => this.details()?.images?.posters ?? []);

  hasMedia = computed(
    () =>
      this.videos().length > 0 ||
      this.backdrops().length > 0 ||
      this.posters().length > 0
  );

  mappedCast = computed<MappedCastMember[]>(() => {
    const castList = this.details()?.credits?.cast || [];
    return castList.slice(0, 20).map((actor) => ({
      ...actor,
      profileUrl: this.movieService.getImageUrl(actor.profile_path, 'w500'),
    }));
  });

  private mapList(list: MediaResult[]): MappedSimilarItem[] {
    const mediaType = this.contentType() === 'movies' ? 'movies' : 'series';
    return list
      .filter((item): item is Movie | TvShow => 'poster_path' in item)
      .map((item) => {
        const date = 'release_date' in item ? item.release_date : item.first_air_date;
        const title = 'title' in item ? item.title : item.name;
        return {
          id: item.id,
          title,
          posterPath: item.poster_path,
          year: date ? String(new Date(date).getFullYear()) : '',
          rating: item.vote_average,
          mediaType,
        };
      });
  }

  mappedSimilar = computed<MappedSimilarItem[]>(() =>
    this.mapList(this.details()?.similar?.results ?? [])
  );

  mappedRecommendations = computed<MappedSimilarItem[]>(() =>
    this.mapList(this.details()?.recommendations?.results ?? [])
  );
}
