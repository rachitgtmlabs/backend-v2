import { ConfigService } from '@nestjs/config';
export declare class GcsThumbnailService {
    private readonly config;
    private readonly logger;
    private client;
    constructor(config: ConfigService);
    private bucketName;
    private getClient;
    uploadPropertyThumbnail(propertyId: string, file: Express.Multer.File | undefined): Promise<string | null>;
    uploadDocument(subfolder: string, buffer: Buffer, originalName: string, mimeType?: string): Promise<string | null>;
    downloadFile(objectPath: string): Promise<{
        buffer: Buffer;
        contentType: string;
    } | null>;
    private extFromMime;
}
