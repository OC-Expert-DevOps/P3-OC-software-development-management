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

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'minio');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const useSsl = this.config.get<boolean>('MINIO_USE_SSL', false);
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'datashare');

    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY');
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be configured');
    }

    const protocol = useSsl ? 'https' : 'http';
    const url = `${protocol}://${endpoint}:${port}`;

    this.client = new S3Client({
      endpoint: url,
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
      const url = await getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
      return url;
    } catch (err) {
      this.logger.error(`Failed to create presigned url for ${key}`, err as any);
      throw err;
    }
  }
}
