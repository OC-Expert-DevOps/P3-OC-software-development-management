# US01 — GitHub Copilot Prompts

This document contains the exact prompts to give to GitHub Copilot Chat in VS Code
for generating the US01 (File Upload) implementation.

**How to use:**
1. Open VS Code with the project
2. Open Copilot Chat (`Ctrl+Shift+I` or `Cmd+Shift+I`)
3. Copy-paste each prompt below into Copilot Chat, one at a time
4. Copy the generated code into the corresponding skeleton file
5. Review the code, fix issues if needed
6. Commit with `Co-authored-by: GitHub Copilot` trailer

---

## Prompt 1 — MinioService

**Target files:** `backend/src/minio/minio.module.ts` + `backend/src/minio/minio.service.ts`

```
I'm building a NestJS backend for a file sharing app called DataShare.
I need a MinioService using @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.

Context:
- MinIO is S3-compatible, running as a Docker service named "minio"
- Environment variables (via NestJS ConfigService):
  - MINIO_ENDPOINT (string, e.g. "minio")
  - MINIO_PORT (number, default 9000)
  - MINIO_ACCESS_KEY (string)
  - MINIO_SECRET_KEY (string)
  - MINIO_BUCKET (string, default "datashare")
  - MINIO_USE_SSL (boolean, default false)

Generate two files:

1. `minio.module.ts` — NestJS module that registers MinioService as a provider and exports it

2. `minio.service.ts` — Injectable NestJS service with:
   - Constructor: creates S3Client with endpoint from config, credentials from env vars
   - `ensureBucket()`: called onModuleInit, creates bucket if it doesn't exist
   - `uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void>`
     Uses PutObjectCommand
   - `deleteFile(key: string): Promise<void>`
     Uses DeleteObjectCommand
   - `getPresignedUrl(key: string, ttlSeconds: number = 300): Promise<string>`
     Uses getSignedUrl from @aws-sdk/s3-request-presigner with GetObjectCommand

Use NestJS @Injectable() decorator. Inject ConfigService.
Handle errors gracefully (log + rethrow).
```

**After generation:**
```bash
git add backend/src/minio/
git commit -m "feat: implement MinioService for S3-compatible file storage

Co-authored-by: GitHub Copilot <175728472+Copilot@users.noreply.github.com>"
```

---

## Prompt 2 — FilesService

**Target files:** `backend/src/files/files.service.ts` + `backend/src/files/dto/upload-file.dto.ts`

```
I need a NestJS FilesService for DataShare.

Context:
- Prisma schema has a File model with fields:
  id (String @id @default(cuid())), userId (String? @map("user_id")),
  originalName (String @map("original_name")), storagePath (String @map("storage_path")),
  mimeType (String @map("mime_type")), sizeBytes (Int @map("size_bytes")),
  passwordHash (String? @map("password_hash")), isDeleted (Boolean @default(false) @map("is_deleted")),
  createdAt (DateTime @default(now()) @map("created_at")),
  expiresAt (DateTime? @map("expires_at"))
- PrismaService is globally available via dependency injection
- MinioService is available for injection (from MinioModule)
- MAX_FILE_SIZE_BYTES env var (default 1073741824 = 1GB)
- Forbidden extensions: .exe, .bat, .cmd, .sh, .ps1
- FILE_EXPIRY_DAYS_DEFAULT env var (default 7)

Generate:

1. `dto/upload-file.dto.ts` — simple DTO with optional expiryDays (number, 1-7)

2. `files.service.ts` — Injectable NestJS service with:
   a) `uploadFile(userId: string, file: Express.Multer.File, dto?: UploadFileDto): Promise<File>`
      - Validate file size against MAX_FILE_SIZE_BYTES (throw BadRequestException if too large)
      - Validate extension is not in forbidden list (throw BadRequestException)
      - Generate storage key: `${userId}/${randomUUID()}-${file.originalname}`
      - Call minioService.uploadFile(key, file.buffer, file.mimetype)
      - Save to DB via prisma.file.create with expiresAt = now + expiryDays
      - Return created File record

   b) `findAllByUser(userId: string): Promise<File[]>`
      - Return all files where userId matches AND isDeleted = false
      - Order by createdAt desc

   c) `findOne(id: string, userId: string): Promise<File>`
      - Find file by id, throw NotFoundException if not found
      - Throw ForbiddenException if file.userId !== userId
      - Throw NotFoundException if isDeleted = true
      - Return file

   d) `remove(id: string, userId: string): Promise<void>`
      - Find file (use findOne for ownership check)
      - Delete from MinIO via minioService.deleteFile(file.storagePath)
      - Set isDeleted = true in DB
      - Invalidate all download tokens for this file (set expiresAt = now)

Inject PrismaService, MinioService, ConfigService.
Use proper NestJS exceptions (NotFoundException, BadRequestException, ForbiddenException).
Import { randomUUID } from 'crypto'.
```

**After generation:**
```bash
git add backend/src/files/files.service.ts backend/src/files/dto/
git commit -m "feat: implement FilesService (upload, list, findOne, delete)

Co-authored-by: GitHub Copilot <175728472+Copilot@users.noreply.github.com>"
```

---

## Prompt 3 — FilesController

**Target file:** `backend/src/files/files.controller.ts` + `backend/src/files/files.module.ts`

```
I need a NestJS FilesController for DataShare.

Context:
- JwtGuard is at `backend/src/auth/guards/jwt.guard.ts`
  It attaches user as `{ userId: string, email: string }` on `request.user`
- FilesService has methods: uploadFile, findAllByUser, findOne, remove
- File upload uses multipart/form-data with field name "file"
- Use @UseInterceptors(FileInterceptor('file')) from @nestjs/platform-express

Generate two files:

1. `files.controller.ts`:
   - @Controller('files')
   - @UseGuards(JwtGuard) on the ENTIRE controller (all routes protected)
   - Routes:
     a) @Post('upload')
        @UseInterceptors(FileInterceptor('file'))
        Accepts @UploadedFile() file: Express.Multer.File and @Body() dto: UploadFileDto
        Extracts userId from @Req() req (req.user.userId)
        Returns 201 with created file object

     b) @Get()
        Returns list of user's files (200)

     c) @Get(':id')
        Returns single file metadata (200)

     d) @Delete(':id')
        Deletes file, returns 204 (no content)
        Use @HttpCode(HttpStatus.NO_CONTENT)

2. `files.module.ts`:
   - Imports: MinioModule
   - Providers: FilesService
   - Controllers: FilesController

All routes extract userId from request.user.userId.
Add @ApiTags('files') for Swagger documentation.
```

**After generation:**
```bash
git add backend/src/files/files.controller.ts backend/src/files/files.module.ts
git commit -m "feat: implement FilesController (4 JWT-protected routes)

Co-authored-by: GitHub Copilot <175728472+Copilot@users.noreply.github.com>"
```

---

## Prompt 4 — Unit Tests

**Target file:** `backend/src/files/files.service.spec.ts`

```
Generate Jest unit tests for the DataShare FilesService.

File: `backend/src/files/files.service.spec.ts`

Context:
- FilesService depends on: PrismaService, MinioService, ConfigService
- Use jest.fn() manual mocks for all dependencies
- PrismaService has: prisma.file.create, prisma.file.findMany, prisma.file.findUnique,
  prisma.file.update, prisma.downloadToken.updateMany
- MinioService has: uploadFile, deleteFile, getPresignedUrl
- ConfigService has: get (returns env var values)
- MAX_FILE_SIZE_BYTES = 10485760 (10MB for tests)
- Forbidden extensions: .exe, .bat, .cmd, .sh, .ps1

Test cases (10 tests):

1. uploadFile — success: calls MinIO upload + creates DB record
2. uploadFile — file too large: throws BadRequestException
3. uploadFile — forbidden extension (.exe): throws BadRequestException
4. uploadFile — sets correct expiresAt based on expiryDays
5. findAllByUser — returns only non-deleted files for the user
6. findAllByUser — returns empty array when no files
7. findOne — returns file when user is owner
8. findOne — throws NotFoundException when file not found
9. remove — deletes from MinIO + sets isDeleted=true + invalidates tokens
10. remove — throws ForbiddenException when userId doesn't match

Structure:
- beforeEach: create Testing module with mocked providers
- describe blocks for each method
- Use expect().rejects.toThrow() for error cases
```

**After generation:**
```bash
git add backend/src/files/files.service.spec.ts
git commit -m "test: add 10 unit tests for FilesService

Co-authored-by: GitHub Copilot <175728472+Copilot@users.noreply.github.com>"
```

---

## After All Prompts — Register Module

Don't forget to import `FilesModule` in `app.module.ts`:

```typescript
// backend/src/app.module.ts
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    FilesModule,  // ← ADD THIS
  ],
  // ...
})
```

Commit:
```bash
git commit -m "feat: register FilesModule in AppModule

Co-authored-by: GitHub Copilot <175728472+Copilot@users.noreply.github.com>"
```
