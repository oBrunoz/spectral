import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AccessTokenPayload } from '../auth/token.service.js';
import { MediaRefDto } from '../media/dto/media-ref.dto.js';
import { WatchlistService } from './watchlist.service.js';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() pagina: PaginationDto,
  ) {
    return this.watchlist.list(user.sub, pagina);
  }

  @Get(':mediaType/:tmdbId')
  async contains(
    @CurrentUser() user: AccessTokenPayload,
    @Param() ref: MediaRefDto,
  ) {
    return {
      present: await this.watchlist.contains(
        user.sub,
        ref.tmdbId,
        ref.mediaType,
      ),
    };
  }

  @Post()
  add(@CurrentUser() user: AccessTokenPayload, @Body() ref: MediaRefDto) {
    return this.watchlist.add(user.sub, ref.tmdbId, ref.mediaType);
  }

  @Delete(':mediaType/:tmdbId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param() ref: MediaRefDto,
  ): Promise<void> {
    return this.watchlist.remove(user.sub, ref.tmdbId, ref.mediaType);
  }
}
