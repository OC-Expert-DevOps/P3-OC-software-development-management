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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { DownloadService } from './download.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Controller()
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  // --- Authenticated routes (JWT required) ---

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

  @UseGuards(JwtGuard)
  @Get('files/:id/links')
  async findByFile(@Req() req: any, @Param('id') fileId: string) {
    const userId = req.user.userId as string;
    return this.downloadService.findByFile(fileId, userId);
  }

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

  // --- Public route (no JWT) ---

  @Get('download/:token')
  async useToken(@Param('token') token: string, @Res() res: Response) {
    const presignedUrl = await this.downloadService.useToken(token);
    return res.redirect(HttpStatus.FOUND, presignedUrl);
  }
}
