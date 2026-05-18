import { Storage } from '@google-cloud/storage';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import { basename } from 'path';

@Injectable()
export class GcsThumbnailService {
  private readonly logger = new Logger(GcsThumbnailService.name);
  private client: Storage | null = null;

  constructor(private readonly config: ConfigService) {}

  private bucketName(): string | undefined {
    const b = this.config.get<string>('GCS_BUCKET')?.trim();
    return b || undefined;
  }

  private getClient(): Storage | null {
    if (this.client) {
      return this.client;
    }
    if (!this.bucketName()) {
      return null;
    }

    const projectId = this.config.get<string>('GCS_PROJECT_ID')?.trim();
    const clientEmail = this.config.get<string>('GCS_CLIENT_EMAIL')?.trim();
    let privateKey = this.config.get<string>('GCS_PRIVATE_KEY');
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (clientEmail && privateKey) {
      this.client = new Storage({
        projectId: projectId || undefined,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    } else {
      this.client = new Storage(
        projectId ? { projectId } : undefined,
      );
    }
    return this.client;
  }

  /**
   * Uploads thumbnail bytes to GCS when GCS_BUCKET is set and credentials work.
   * Returns the GCS object path (not full URL) on success, null otherwise.
   */
  async uploadPropertyThumbnail(
    propertyId: string,
    file: Express.Multer.File | undefined,
  ): Promise<string | null> {
    if (!this.bucketName()) {
      this.logger.debug('GCS_BUCKET unset; thumbnail not uploaded');
      return null;
    }

    if (!file) {
      return null;
    }

    const buf = file.buffer;
    const size = buf?.length ?? file.size ?? 0;
    if (size < 1) {
      return null;
    }

    const storage = this.getClient();
    if (!storage) {
      return null;
    }

    const bucket = storage.bucket(this.bucketName()!);
    const safeBase = basename(file.originalname || 'image').replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const suffix = safeBase.includes('.') ? '' : this.extFromMime(file.mimetype);
    const objectPath = `properties/${propertyId}/${Date.now()}-${safeBase}${suffix}`;

    const gcsFile = bucket.file(objectPath);
    try {
      await gcsFile.save(buf as Buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });
    } catch (err) {
      this.logger.error('GCS thumbnail upload failed', err);
      throw err;
    }

    return objectPath;
  }

  /**
   * Downloads a file from GCS by object path and returns buffer + content type.
   */
  async downloadFile(
    objectPath: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.bucketName()) {
      return null;
    }

    const storage = this.getClient();
    if (!storage) {
      return null;
    }

    try {
      const bucket = storage.bucket(this.bucketName()!);
      const file = bucket.file(objectPath);
      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || 'application/octet-stream';
      return { buffer, contentType };
    } catch (err) {
      this.logger.error(`Failed to download ${objectPath} from GCS`, err);
      return null;
    }
  }

  private extFromMime(mime: string | undefined): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/gif':
        return '.gif';
      case 'image/svg+xml':
        return '.svg';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }
}
