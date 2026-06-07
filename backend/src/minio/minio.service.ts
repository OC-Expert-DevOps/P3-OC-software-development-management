import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly internalUrl: string;
  private readonly publicUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'minio');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'datashare');

    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY');
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be configured');
    }

    const protocol = useSsl ? 'https' : 'http';
    this.internalUrl = `${protocol}://${endpoint}:${port}`;
    this.publicUrl = this.config.get<string>('MINIO_PUBLIC_URL', '') || null;

    this.client = new S3Client({
      endpoint: this.internalUrl,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists`);
    } catch (err: any) {
      // If the bucket does not exist, create it
      try {
        this.logger.log(`Creating bucket "${this.bucket}"`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (createErr) {
        this.logger.error('Failed to create bucket', createErr as any);
        throw createErr;
      }
    }
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.client.send(cmd);
    } catch (err) {
      this.logger.error(`Failed to upload file ${key}`, err as any);
      throw err;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const cmd = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
      await this.client.send(cmd);
    } catch (err) {
      this.logger.error(`Failed to delete file ${key}`, err as any);
      throw err;
    }
  }

  async getPresignedUrl(key: string, ttlSeconds = 300): Promise<string> {
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      let url = await getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
      // Replace internal Docker hostname with public URL for browser access
      if (this.publicUrl) {
        url = url.replace(this.internalUrl, this.publicUrl);
      }
      return url;
    } catch (err) {
      this.logger.error(`Failed to create presigned url for ${key}`, err as any);
      throw err;
    }
  }
}
