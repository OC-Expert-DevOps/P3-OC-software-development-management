import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { DownloadModule } from './download/download.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 120 requests/minute/IP. Sensitive routes (auth, public
    // download) apply a stricter @Throttle() override on top of this. 60 was
    // empirically too tight: DashboardPage re-fetches GET /files on every
    // mount (login, post-upload redirect, ...), so routine navigation alone
    // — not just abuse — can rack up a lot of hits to the same route fast.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    FilesModule,
    DownloadModule,
    CleanupModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
