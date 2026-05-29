"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GcsThumbnailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcsThumbnailService = void 0;
const storage_1 = require("@google-cloud/storage");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
let GcsThumbnailService = GcsThumbnailService_1 = class GcsThumbnailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GcsThumbnailService_1.name);
        this.client = null;
    }
    bucketName() {
        const b = this.config.get('GCS_BUCKET')?.trim();
        return b || undefined;
    }
    getClient() {
        if (this.client) {
            return this.client;
        }
        if (!this.bucketName()) {
            return null;
        }
        const projectId = this.config.get('GCS_PROJECT_ID')?.trim();
        const clientEmail = this.config.get('GCS_CLIENT_EMAIL')?.trim();
        let privateKey = this.config.get('GCS_PRIVATE_KEY');
        if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        if (clientEmail && privateKey) {
            this.client = new storage_1.Storage({
                projectId: projectId || undefined,
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey,
                },
            });
        }
        else {
            this.client = new storage_1.Storage(projectId ? { projectId } : undefined);
        }
        return this.client;
    }
    async uploadPropertyThumbnail(propertyId, file) {
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
        const bucket = storage.bucket(this.bucketName());
        const safeBase = (0, path_1.basename)(file.originalname || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
        const suffix = safeBase.includes('.') ? '' : this.extFromMime(file.mimetype);
        const objectPath = `properties/${propertyId}/${Date.now()}-${safeBase}${suffix}`;
        const gcsFile = bucket.file(objectPath);
        try {
            await gcsFile.save(buf, {
                contentType: file.mimetype || 'application/octet-stream',
                resumable: false,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });
        }
        catch (err) {
            this.logger.error('GCS thumbnail upload failed', err);
            throw err;
        }
        return objectPath;
    }
    async uploadDocument(subfolder, buffer, originalName, mimeType = 'application/pdf') {
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
        const safeBase = (0, path_1.basename)(originalName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `documents/${subfolder}/${Date.now()}-${safeBase}`;
        const gcsFile = storage.bucket(this.bucketName()).file(objectPath);
        try {
            await gcsFile.save(buffer, {
                contentType: mimeType,
                resumable: false,
                metadata: { cacheControl: 'private, max-age=3600' },
            });
        }
        catch (err) {
            this.logger.error('GCS document upload failed', err);
            throw err;
        }
        return objectPath;
    }
    async downloadFile(objectPath) {
        if (!this.bucketName()) {
            return null;
        }
        const storage = this.getClient();
        if (!storage) {
            return null;
        }
        try {
            const bucket = storage.bucket(this.bucketName());
            const file = bucket.file(objectPath);
            const [buffer] = await file.download();
            const [metadata] = await file.getMetadata();
            const contentType = metadata.contentType || 'application/octet-stream';
            return { buffer, contentType };
        }
        catch (err) {
            this.logger.error(`Failed to download ${objectPath} from GCS`, err);
            return null;
        }
    }
    extFromMime(mime) {
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
};
exports.GcsThumbnailService = GcsThumbnailService;
exports.GcsThumbnailService = GcsThumbnailService = GcsThumbnailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GcsThumbnailService);
//# sourceMappingURL=gcs-thumbnail.service.js.map