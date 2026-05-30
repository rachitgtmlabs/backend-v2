import { Storage } from '@google-cloud/storage';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import { basename } from 'path';
import sharp from 'sharp';

// Thumbnails render at a few hundred px; cap the longest side generously and
// re-encode lossily to WebP so multi-MB uploads land as ~100-200KB objects.
const THUMBNAIL_MAX_DIMENSION = 1200;
const THUMBNAIL_WEBP_QUALITY = 80;

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
    if (!buf?.length) {
      return null;
    }

    const storage = this.getClient();
    if (!storage) {
      return null;
    }

    const { buffer, contentType, ext } = await this.compressThumbnail(
      buf,
      file.mimetype,
    );

    const bucket = storage.bucket(this.bucketName()!);
    // Re-encoding changes the format, so derive the object name from the
    // property id + final extension rather than the (untrusted) upload name.
    const objectPath = `properties/${propertyId}/${Date.now()}-thumbnail${ext}`;

    const gcsFile = bucket.file(objectPath);
    try {
      await gcsFile.save(buffer, {
        contentType,
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
   * Resizes (longest side capped) and lossily re-encodes a raster image to
   * WebP. SVGs are vector and pass through untouched. If sharp fails to decode
   * the input, the original bytes are stored as-is so the upload still works.
   */
  private async compressThumbnail(
    input: Buffer,
    mimetype: string | undefined,
  ): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
    if (mimetype === 'image/svg+xml') {
      return { buffer: input, contentType: 'image/svg+xml', ext: '.svg' };
    }

    try {
      const buffer = await sharp(input, { animated: true })
        .rotate() // honour EXIF orientation before metadata is stripped
        .resize({
          width: THUMBNAIL_MAX_DIMENSION,
          height: THUMBNAIL_MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: THUMBNAIL_WEBP_QUALITY })
        .toBuffer();
      return { buffer, contentType: 'image/webp', ext: '.webp' };
    } catch (err) {
      this.logger.warn(
        'Thumbnail compression failed; storing original bytes',
        err as Error,
      );
      return {
        buffer: input,
        contentType: mimetype || 'application/octet-stream',
        ext: this.extFromMime(mimetype) || '',
      };
    }
  }

  /**
   * Uploads a document (PDF) to GCS under `documents/{subfolder}/{timestamp}-{filename}`.
   * Returns the GCS object path on success, null if GCS is not configured.
   */
  async uploadDocument(
    subfolder: string,
    buffer: Buffer,
    originalName: string,
    mimeType = 'application/pdf',
  ): Promise<string | null> {
    if (!this.bucketName()) {
      this.logger.debug('GCS_BUCKET unset; document not uploaded');
      return null;
    }
    if (!buffer?.length) {
      return null;
    }
    const storage = this.getClient();
    if (!storage) {
      return null;
    }
    const safeBase = basename(originalName || 'document').replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const objectPath = `documents/${subfolder}/${Date.now()}-${safeBase}`;
    const gcsFile = storage.bucket(this.bucketName()!).file(objectPath);
    try {
      await gcsFile.save(buffer, {
        contentType: mimeType,
        resumable: false,
        metadata: { cacheControl: 'private, max-age=3600' },
      });
    } catch (err) {
      this.logger.error('GCS document upload failed', err);
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
