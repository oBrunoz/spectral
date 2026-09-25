import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TmdbService } from './tmdb.service.js';

const PREFIXOS_PERMITIDOS = new Set([
  'movie',
  'tv',
  'person',
  'genre',
  'search',
  'discover',
  'trending',
  'configuration',
  'watch',
]);

const SEGMENTO_VALIDO = /^[A-Za-z0-9_-]+$/;

const MAX_SEGMENTOS = 6;

@Controller('tmdb')
export class TmdbController {
  constructor(private readonly tmdb: TmdbService) {}

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('*path')
  proxy(
    @Param('path') path: string[],
    @Query() query: Record<string, string>,
  ): Promise<unknown> {
    const segmentos = Array.isArray(path) ? path : [path];

    if (segmentos.length === 0 || segmentos.length > MAX_SEGMENTOS) {
      throw new BadRequestException('Endpoint não permitido');
    }

    if (!segmentos.every((s) => SEGMENTO_VALIDO.test(s))) {
      throw new BadRequestException('Endpoint não permitido');
    }

    if (!PREFIXOS_PERMITIDOS.has(segmentos[0])) {
      throw new BadRequestException('Endpoint não permitido');
    }

    const { api_key: _chave, ...resto } = query;

    return this.tmdb.get(`/${segmentos.join('/')}`, resto);
  }
}
