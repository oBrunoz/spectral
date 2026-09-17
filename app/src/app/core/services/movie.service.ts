import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Movie,
  TvShow,
  TmdbListResponse,
  VideoResponse,
  ImagesResponse,
  ContentDetails,
  MediaResult,
  SpotlightData,
  Spotlight,
  Genre,
  Review,
  SeasonDetails,
  WatchProviderCountry
} from '../models/tmdb.models';

@Injectable({
  providedIn: 'root',
})
export class MovieService {
  private readonly baseUrl = environment.tmdbBaseUrl;
  private readonly apiKey = environment.tmdbApiKey;
  private readonly lang = 'pt-BR';

  constructor(private http: HttpClient) {}

  private get<T>(endpoint: string, extraParams: Record<string, any> = {}): Observable<T> {
    let params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', this.lang);

    Object.entries(extraParams).forEach(([key, value]) => {
      params = params.set(key, String(value));
    });

    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
  }

  getPopularMovies(page = 1): Observable<TmdbListResponse<Movie>> {
    return this.get<TmdbListResponse<Movie>>('/movie/popular', { page });
  }

  getTrendingMovies(timeWindow: 'day' | 'week' = 'week', page = 1): Observable<TmdbListResponse<Movie>> {
    return this.get<TmdbListResponse<Movie>>(`/trending/movie/${timeWindow}`, { page });
  }

  getTrendingTv(timeWindow: 'day' | 'week' = 'week', page = 1): Observable<TmdbListResponse<TvShow>> {
    return this.get<TmdbListResponse<TvShow>>(`/trending/tv/${timeWindow}`, { page });
  }

  searchMulti(query: string, page = 1): Observable<TmdbListResponse<MediaResult>> {
    return this.get<TmdbListResponse<MediaResult>>('/search/multi', { query, page });
  }

  getMovieDetails(id: number): Observable<ContentDetails> {
    return this.get<ContentDetails>(`/movie/${id}`, {
      append_to_response:
        'credits,similar,recommendations,videos,images,keywords,external_ids,release_dates,watch/providers',
      include_image_language: 'pt,en,null',
      include_video_language: 'pt,en',
    });
  }

  getTvDetails(id: number): Observable<ContentDetails> {
    return this.get<ContentDetails>(`/tv/${id}`, {
      append_to_response:
        'credits,similar,recommendations,videos,images,keywords,external_ids,content_ratings,watch/providers',
      include_image_language: 'pt,en,null',
      include_video_language: 'pt,en',
    });
  }

  getContentDetails(id: number, type: 'movie' | 'tv'): Observable<ContentDetails> {
    return type === 'movie' ? this.getMovieDetails(id) : this.getTvDetails(id);
  }

  /**
   * As reviews da TMDB são quase todas em inglês; pedir em pt-BR devolve lista vazia.
   */
  getReviews(id: number, type: 'movie' | 'tv', page = 1): Observable<TmdbListResponse<Review>> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'en-US')
      .set('page', String(page));

    return this.http
      .get<TmdbListResponse<Review>>(`${this.baseUrl}/${type}/${id}/reviews`, { params })
      .pipe(catchError(() => of({ page: 1, results: [], total_pages: 0, total_results: 0 })));
  }

  getSeasonDetails(tvId: number, seasonNumber: number): Observable<SeasonDetails> {
    return this.get<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
  }

  /** Provedores de streaming do país informado (padrão Brasil). */
  getWatchProviders(details: ContentDetails | null, country = 'BR'): WatchProviderCountry | null {
    return details?.['watch/providers']?.results?.[country] ?? null;
  }

  /** Classificação indicativa brasileira (filme usa release_dates, série usa content_ratings). */
  getCertification(details: ContentDetails | null, country = 'BR'): string {
    if (!details) return '';

    const tvRating = details.content_ratings?.results?.find((r) => r.iso_3166_1 === country);
    if (tvRating?.rating) return tvRating.rating;

    const movieEntry = details.release_dates?.results?.find((r) => r.iso_3166_1 === country);
    const cert = movieEntry?.release_dates?.find((d) => d.certification)?.certification;
    return cert ?? '';
  }

  getMovieVideos(id: number): Observable<VideoResponse> {
    return this.get<VideoResponse>(`/movie/${id}/videos`);
  }

  getTvVideos(id: number): Observable<VideoResponse> {
    return this.get<VideoResponse>(`/tv/${id}/videos`);
  }

  getMovieImages(id: number): Observable<ImagesResponse> {
    return this.get<ImagesResponse>(`/movie/${id}/images`, {
      include_image_language: 'pt,en,null',
    });
  }

  getTvImages(id: number): Observable<ImagesResponse> {
    return this.get<ImagesResponse>(`/tv/${id}/images`, {
      include_image_language: 'pt,en,null',
    });
  }

  private pickLogoUrl(images: ImagesResponse): string {
    const logos = images?.logos ?? [];
    const ptLogo = logos.find((l) => l.iso_639_1 === 'pt');
    const enLogo = logos.find((l) => l.iso_639_1 === 'en');
    const logo = ptLogo ?? enLogo ?? logos[0];
    return logo
      ? `${environment.tmdbImageUrl}/original${logo.file_path}`
      : '/images/image_not_found.png';
  }

  getContentImages(id: number, type: 'movie' | 'tv'): Observable<ImagesResponse> {
    return type === 'movie' ? this.getMovieImages(id) : this.getTvImages(id);
  }

  getTrailerUrl(id: number, type: 'movie' | 'tv' = 'movie'): Observable<string> {
    const videosReq = type === 'movie' ? this.getMovieVideos(id) : this.getTvVideos(id);

    return videosReq.pipe(
      switchMap((data) => {
        const trailer = data?.results?.find(
          (v) => v.type === 'Trailer' && v.site === 'YouTube'
        );
        if (trailer) return of(`https://www.youtube.com/embed/${trailer.key}`);

        // Fallback: busca em inglês se não encontrar em pt-BR
        let params = new HttpParams()
          .set('api_key', this.apiKey)
          .set('language', 'en-US');
        const endpoint = type === 'movie' ? `/movie/${id}/videos` : `/tv/${id}/videos`;
        return this.http.get<VideoResponse>(`${this.baseUrl}${endpoint}`, { params }).pipe(
          map((d) => {
            const t = d?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
            return t ? `https://www.youtube.com/embed/${t.key}` : '#';
          }),
          catchError(() => of('#'))
        );
      }),
      catchError(() => of('#'))
    );
  }

  getImageUrl(path: string | null, size: string = 'w500'): string {
    if (!path) return '/images/image_not_found.png';
    return `${environment.tmdbImageUrl}/${size}${path}`;
  }

  /** Monta o destaque a partir de um único /movie/{id} — imagens e vídeos já vêm anexados. */
  private toSpotlight(movie: Movie, details: ContentDetails): SpotlightData {
    const images = details.images ?? ({ backdrops: [], posters: [], logos: [] } as ImagesResponse);
    const trailer = (details.videos?.results ?? []).find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );

    return {
      movie,
      details,
      backgroundUrl: images.backdrops?.[0]
        ? `${environment.tmdbImageUrl}/original${images.backdrops[0].file_path}`
        : '/images/image_not_found.png',
      logoUrl: this.pickLogoUrl(images),
      trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '#',
    };
  }

  getSpotlightMovie(): Observable<SpotlightData> {
    return this.getPopularMovies().pipe(
      switchMap((data) => {
        const movie = data.results[0];
        return this.getMovieDetails(movie.id).pipe(
          map((details) => this.toSpotlight(movie, details))
        );
      })
    );
  }

  getSpotlightMovies(count = 5): Observable<SpotlightData[]> {
    return this.getTrendingMovies().pipe(
      switchMap((data) =>
        forkJoin(
          data.results.slice(0, count).map((movie) =>
            this.getMovieDetails(movie.id).pipe(
              map((details) => this.toSpotlight(movie, details))
            )
          )
        )
      )
    );
  }

  // Lista de gêneros
  getGenres(type: 'movie' | 'tv'): Observable<Genre[]> {
    return this.get<{ genres: Genre[] }>(`/genre/${type}/list`).pipe(
      map((data) => data.genres ?? []),
      catchError(() => of([]))
    );
  }

  // Catálogo por gênero. Sem `genreId` devolve o populares geral.
  discover<T>(
    type: 'movie' | 'tv',
    options: { genreId?: number | null; page?: number } = {}
  ): Observable<TmdbListResponse<T>> {
    const params: Record<string, any> = {
      page: options.page ?? 1,
      sort_by: 'popularity.desc',
      'vote_count.gte': 150,
      include_adult: false,
    };

    if (options.genreId) params['with_genres'] = options.genreId;

    return this.get<TmdbListResponse<T>>(`/discover/${type}`, params);
  }

  // Destaque de um título qualquer
  getSpotlight(id: number, type: 'movie' | 'tv'): Observable<Spotlight> {
    return this.getContentDetails(id, type).pipe(
      map((details) => this.toGenericSpotlight(details, type))
    );
  }

  // Monta o destaque a partir de um /movie/{id} ou /tv/{id}
  private toGenericSpotlight(details: ContentDetails, type: 'movie' | 'tv'): Spotlight {
    const images = details.images ?? ({ backdrops: [], posters: [], logos: [] } as ImagesResponse);
    const trailer = (details.videos?.results ?? []).find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );
    const date = type === 'movie' ? details.release_date : details.first_air_date;

    return {
      id: details.id,
      type,
      title: details.title ?? details.name ?? '',
      overview: details.overview ?? '',
      voteAverage: details.vote_average ?? 0,
      year: date ? String(new Date(date).getFullYear()) : '',
      runtime: details.runtime ?? details.episode_run_time?.[0] ?? null,
      details,
      backgroundUrl: images.backdrops?.[0]
        ? `${environment.tmdbImageUrl}/original${images.backdrops[0].file_path}`
        : '/images/image_not_found.png',
      logoUrl: this.pickLogoUrl(images),
      trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '#',
    };
  }
}
