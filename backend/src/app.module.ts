import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // TODO: AuthModule,
    // TODO: FilesModule,
    // TODO: DownloadModule,
    // TODO: TagsModule,
    // TODO: PrismaModule,
    // TODO: MinioModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
