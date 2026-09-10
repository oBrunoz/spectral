import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideStar } from '@lucide/angular';

const GENRE_MAP: Record<number, string> = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia',
  36: 'História', 27: 'Terror', 10402: 'Música', 9648: 'Mistério',
  10749: 'Romance', 878: 'Ficção científica', 10770: 'Cinema TV',
  53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste',
};

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideStar],
  templateUrl: './movie-card.component.html',
})
export class MovieCardComponent {
  @Input() id!: number;
  @Input() title!: string;
  @Input() posterPath: string | null = null;
  @Input() backdropPath: string | null = null;
  @Input() year: string = '';
  @Input() rating: number = 0;
  @Input() overview: string = '';
  @Input() genreIds: number[] = [];
  @Input() mediaType: 'movies' | 'series' = 'movies';
  @Input() hoverSide: 'left' | 'right' = 'right';

  get posterUrl(): string {
    return this.posterPath
      ? `https://image.tmdb.org/t/p/w342${this.posterPath}`
      : '/images/image_not_found.png';
  }

  get backdropUrl(): string {
    return this.backdropPath
      ? `https://image.tmdb.org/t/p/w780${this.backdropPath}`
      : '';
  }

  get detailsRoute(): string[] {
    return ['/search', this.mediaType, String(this.id)];
  }

  get resolvedGenres(): string[] {
    return this.genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
  }

  get hasHoverInfo(): boolean {
    return !!(this.overview || this.genreIds.length || this.backdropPath);
  }
}
