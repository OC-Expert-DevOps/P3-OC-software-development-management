import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { DownloadService } from './download.service';
import { CreateLinkDto } from './dto/create-link.dto';

@ApiTags('Downloads')
@Controller()
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  // --- Authenticated routes (JWT required) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Post('files/:id/links')
  async createLink(
    @Req() req: any,
    @Param('id') fileId: string,
    @Body() dto: CreateLinkDto,
  ) {
    const userId = req.user.userId as string;
    return this.downloadService.createLink(fileId, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('files/:id/links')
  async findByFile(@Req() req: any, @Param('id') fileId: string) {
    const userId = req.user.userId as string;
    return this.downloadService.findByFile(fileId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Delete('files/:id/links/:tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeLink(
    @Req() req: any,
    @Param('id') fileId: string,
    @Param('tokenId') tokenId: string,
  ) {
    const userId = req.user.userId as string;
    await this.downloadService.revokeLink(fileId, tokenId, userId);
  }

  // --- Public routes (no JWT) ---

  /** Return file metadata + hasPassword flag for download page. */
  @Get('download/:token/info')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getTokenInfo(@Param('token') token: string) {
    return this.downloadService.getTokenInfo(token);
  }

  /** Stream the file through the backend (proxied from MinIO). */
  @Get('download/:token')
  // Stricter than the info endpoint: this is also where a password-protected
  // file's password is checked, so it's the real brute-force target.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async downloadFile(
    @Param('token') token: string,
    @Query('password') password: string | undefined,
    @Res() res: Response,
  ) {
    const fileData = await this.downloadService.streamFile(token, password);

    res.set({
      'Content-Type': fileData.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.originalName)}"`,
      ...(fileData.contentLength ? { 'Content-Length': String(fileData.contentLength) } : {}),
    });

    const readable = fileData.stream as Readable;
    readable.pipe(res);
  }
}
