import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MediaType } from '../generated/prisma/enums.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const LANG = 'pt-BR';

export interface TmdbMedia {
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: Date | null;
}

interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
}

@Injectable()
export class TmdbService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.get<T>(`${BASE_URL}${path}`, {
          params: {
            ...params,
            api_key: this.config.getOrThrow<string>('TMDB_API_KEY'),
            language: LANG,
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw TmdbService.traduzErro(error);
    }
  }

  async fetchMedia(tmdbId: number, type: MediaType): Promise<TmdbMedia> {
    const segmento = type === 'MOVIE' ? 'movie' : 'tv';
    const dados = await this.get<TmdbDetails>(`/${segmento}/${tmdbId}`);
    const lancamento = dados.release_date || dados.first_air_date;

    return {
      tmdbId,
      type,
      title: dados.title ?? dados.name ?? 'Sem título',
      posterPath: dados.poster_path ?? null,
      releaseDate: lancamento ? new Date(lancamento) : null,
    };
  }

  private static traduzErro(error: unknown): Error {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 404) {
      return new NotFoundException('Título não encontrado na TMDB');
    }
    return new BadGatewayException('Falha ao consultar a TMDB');
  }
}
