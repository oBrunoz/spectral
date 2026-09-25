import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AccessTokenPayload } from '../auth/token.service.js';
import { FollowService } from './follow.service.js';

@Controller('follow')
export class FollowController {
  constructor(private readonly follows: FollowService) {}

  @Get(':userId/followers')
  followers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() pagina: PaginationDto,
  ) {
    return this.follows.followers(userId, pagina);
  }

  @Get(':userId/following')
  following(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() pagina: PaginationDto,
  ) {
    return this.follows.following(userId, pagina);
  }

  @Get(':userId/counts')
  counts(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.follows.counts(userId);
  }

  @Post(':userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  follow(
    @CurrentUser() user: AccessTokenPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.follows.follow(user.sub, userId);
  }

  @Delete(':userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(
    @CurrentUser() user: AccessTokenPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.follows.unfollow(user.sub, userId);
  }
}
