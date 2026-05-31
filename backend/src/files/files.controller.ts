import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';

@ApiTags('files')
@UseGuards(JwtGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @Body() dto: UploadFileDto) {
    const file = req.file as Express.Multer.File;
    const userId = req.user?.userId as string;
    return this.filesService.uploadFile(userId, file, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.userId as string;
    return this.filesService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Req() req: any) {
    const userId = req.user?.userId as string;
    const id = req.params.id as string;
    return this.filesService.findOne(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any) {
    const userId = req.user?.userId as string;
    const id = req.params.id as string;
    await this.filesService.remove(id, userId);
  }
}
