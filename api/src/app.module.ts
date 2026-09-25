import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validate } from './config/env.validation.js';
import { FollowModule } from './follow/follow.module.js';
import { HealthModule } from './health/health.module.js';
import { MediaModule } from './media/media.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReviewModule } from './review/review.module.js';
import { TmdbModule } from './tmdb/tmdb.module.js';
import { UserModule } from './user/user.module.js';
import { WatchlistModule } from './watchlist/watchlist.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    HealthModule,
    UserModule,
    AuthModule,
    TmdbModule,
    MediaModule,
    WatchlistModule,
    ReviewModule,
    FollowModule,
  ],
})
export class AppModule {}
