import { Module } from '@nestjs/common';
import { MinioModule } from '../minio/minio.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [MinioModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
