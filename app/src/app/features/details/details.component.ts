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
import { ContentDetails, ImagesResponse, Movie, TvShow } from '../../core/models/tmdb.models';
import { environment } from '../../../environments/environment';


export interface MappedSimilarItem {
  id: number;
  title: string;
  posterPath: string | null;
  year: string;
  rating: number;
  mediaType: 'movies' | 'series';
}

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroSectionComponent, MovieCardComponent, CastCard, CarouselRowComponent],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css'],
})
export class DetailsComponent implements OnInit, OnDestroy {
  details = signal<ContentDetails | null>(null);
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

          const detailsReq =
            type === 'movies'
              ? this.movieService.getMovieDetails(id)
              : type === 'series'
              ? this.movieService.getTvDetails(id)
              : of(null as any);

          const trailerReq =
            type === 'movies'
              ? this.movieService.getTrailerUrl(id, 'movie')
              : type === 'series'
              ? this.movieService.getTrailerUrl(id, 'tv')
              : of('#');

          const imagesReq =
            type === 'movies' || type === 'series'
              ? this.movieService.getContentImages(id, type === 'movies' ? 'movie' : 'tv')
              : of(null as any);

          return forkJoin({
            details: detailsReq.pipe(catchError(() => of(null))),
            trailerUrl: trailerReq.pipe(catchError(() => of('#'))),
            images: imagesReq.pipe(catchError(() => of(null as ImagesResponse | null))),
          });
        })
      )
      .subscribe({
        next: ({ details, trailerUrl, images }) => {
          this.details.set(details);
          this.trailerUrl.set(trailerUrl);

          const backdrop = images?.backdrops?.[0]?.file_path ?? details?.backdrop_path;
          this.backgroundUrl.set(
            backdrop ? `${environment.tmdbImageUrl}/original${backdrop}` : ''
          );

          this.logoUrl.set(
            images?.logos?.[0]?.file_path
              ? `${environment.tmdbImageUrl}/original${images.logos[0].file_path}`
              : ''
          );

          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
    if (this.contentType() === 'series' && d.episode_run_time?.length) {
      return `${d.episode_run_time[0]} min/ep`;
    }
    return '';
  }

  mappedCast = computed<MappedCastMember[]>(() => {
    const castList = this.details()?.credits?.cast || [];
    return castList.map(actor => ({
      ...actor,
      profileUrl: this.movieService.getImageUrl(actor.profile_path, 'w500')
    }));
  });

  mappedSimilar = computed<MappedSimilarItem[]>(() => {
    const simList = this.details()?.similar?.results || [];
    return simList
      .filter((item): item is Movie | TvShow => 'poster_path' in item)
      .map(item => {
        const date = 'release_date' in item ? item.release_date : item.first_air_date;
        const title = 'title' in item ? item.title : item.name;
        const mediaType = this.contentType() === 'movies' ? 'movies' : 'series';
        return {
          id: item.id,
          title: title,
          posterPath: item.poster_path,
          year: date ? String(new Date(date).getFullYear()) : '',
          rating: item.vote_average,
          mediaType: mediaType
        };
      });
  });

}
