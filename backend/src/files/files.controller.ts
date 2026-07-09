import 'multer'; // Required for Express.Multer.File type
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ManageTagsDto } from './dto/manage-tags.dto';

// Multer buffers the whole request body in memory before FilesService gets a
// chance to check file.size — without this, an oversized request is rejected
// only *after* being fully buffered. Read from env directly (decorators are
// evaluated before Nest's DI container exists, so ConfigService isn't
// available here) — kept in sync with FilesService's own default.
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES) || 1073741824;

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // --- Anonymous route (NO JWT) ---

  @Post('anonymous')
  // No JWT guard on this route, so it's a more attractive DoS/spam target
  // than the authenticated upload — throttled tighter than the global default.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadAnonymous(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadAnonymous(file);
  }

  // --- Authenticated routes (JWT required) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadFile(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.uploadFile(userId, file, dto);
  }

  // IMPORTANT: stats MUST be before :id to avoid "stats" being captured as a UUID
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('stats')
  async getStats(@Req() req: any) {
    const userId = req.user.userId as string;
    return this.filesService.getStats(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user.userId as string;
    return this.filesService.findAllByUser(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.userId as string;
    return this.filesService.findOne(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.userId as string;
    await this.filesService.remove(id, userId);
  }

  // --- Password management (US09) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Put(':id/password')
  async setPassword(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPasswordDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.setPassword(id, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Delete(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePassword(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.userId as string;
    await this.filesService.removePassword(id, userId);
  }

  // --- Tags management (US08) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Put(':id/tags')
  async setTags(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManageTagsDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.setTags(id, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get(':id/tags')
  async getTags(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.userId as string;
    return this.filesService.getTags(id, userId);
  }

  // --- Per-file download history (extra feature, not one of the 10 official user stories — US10 in memory-bank/projectbrief.md is the automatic cleanup cron) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get(':id/history')
  async getHistory(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.userId as string;
    return this.filesService.getHistory(id, userId);
  }
}
