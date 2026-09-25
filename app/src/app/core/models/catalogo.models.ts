export type TipoMidia = 'movie' | 'tv';

export interface Midia {
  id: string;
  tmdbId: number;
  type: 'MOVIE' | 'TV';
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
}

export interface ItemWatchlist {
  id: string;
  addedAt: string;
  media: Midia;
}

export interface AutorResumo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface AvaliacaoUsuario {
  id: string;
  rating: number | null;
  content: string | null;
  watchedAt: string | null;
  createdAt: string;
  media?: Midia;
  user?: AutorResumo;
}

export interface EnvioAvaliacao {
  tmdbId: number;
  mediaType: TipoMidia;
  rating?: number;
  content?: string;
}
