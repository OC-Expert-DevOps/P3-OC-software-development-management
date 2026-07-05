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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ManageTagsDto } from './dto/manage-tags.dto';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // --- Anonymous route (NO JWT) ---

  @Post('anonymous')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAnonymous(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadAnonymous(file);
  }

  // --- Authenticated routes (JWT required) ---

  @ApiBearerAuth()
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
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.findOne(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    await this.filesService.remove(id, userId);
  }

  // --- Password management (US09) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Put(':id/password')
  async setPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SetPasswordDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.setPassword(id, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Delete(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePassword(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    await this.filesService.removePassword(id, userId);
  }

  // --- Tags management (US08) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Put(':id/tags')
  async setTags(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ManageTagsDto,
  ) {
    const userId = req.user.userId as string;
    return this.filesService.setTags(id, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get(':id/tags')
  async getTags(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.getTags(id, userId);
  }

  // --- Per-file download history (extra feature, not one of the 10 official user stories — US10 in memory-bank/projectbrief.md is the automatic cleanup cron) ---

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get(':id/history')
  async getHistory(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId as string;
    return this.filesService.getHistory(id, userId);
  }
}
