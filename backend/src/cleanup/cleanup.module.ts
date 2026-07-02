import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [PrismaModule, MinioModule],
  providers: [CleanupService],
})
export class CleanupModule {}
