import 'multer'; // Required for Express.Multer.File type
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';

@UseGuards(JwtGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.uploadFile(userId, file, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user.userId as string;
    return this.filesService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.findOne(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    await this.filesService.remove(id, userId);
  }
}
