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
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ManageTagsDto } from './dto/manage-tags.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // ─── Authenticated routes ───────────────────────────────────────

  @UseGuards(JwtGuard)
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

  @UseGuards(JwtGuard)
  @Get('stats')
  async getStats(@Req() req: any) {
    const userId = req.user.userId as string;
    return this.filesService.getStats(userId);
  }

  @UseGuards(JwtGuard)
  @Get()
  async findAll(@Req() req: any, @Query() dto: ListFilesDto) {
    const userId = req.user.userId as string;
    return this.filesService.findAllByUser(userId, dto);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.findOne(id, userId);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    await this.filesService.remove(id, userId);
  }

  // ─── US07: Password-protected files ─────────────────────────────

  @UseGuards(JwtGuard)
  @Put(':id/password')
  async setPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SetPasswordDto,
  ) {
    const userId = req.user.userId as string;
    await this.filesService.setPassword(id, userId, dto.password);
    return { message: 'Password set successfully' };
  }

  @UseGuards(JwtGuard)
  @Delete(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePassword(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    await this.filesService.removePassword(id, userId);
  }

  // ─── US08: Anonymous upload (PUBLIC) ────────────────────────────

  @Post('anonymous')
  @UseInterceptors(FileInterceptor('file'))
  async anonymousUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    return this.filesService.anonymousUpload(file, dto);
  }

  // ─── US09: File tagging ─────────────────────────────────────────

  @UseGuards(JwtGuard)
  @Put(':id/tags')
  async setTags(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ManageTagsDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.setTags(id, userId, dto.tags);
  }

  @UseGuards(JwtGuard)
  @Get(':id/tags')
  async getTags(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.getTags(id, userId);
  }

  // ─── US10: Download history ─────────────────────────────────────

  @UseGuards(JwtGuard)
  @Get(':id/history')
  async getHistory(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.getDownloadHistory(id, userId);
  }
}
