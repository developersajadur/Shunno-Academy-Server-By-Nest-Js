import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface StorageFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadResult {
  url: string;
  publicId: string;
  provider: string;
  bytes: number;
  format: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadFile(file: StorageFile, folder?: string): Promise<UploadResult> {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const targetFolder = folder || this.configService.get<string>('cloudinary.folder') || 'shunno-academy';

    if (!cloudName || cloudName === 'demo') {
      const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      return {
        url: base64,
        publicId: `local-${Date.now()}`,
        provider: 'cloudinary',
        bytes: file.size,
        format: file.mimetype.split('/')[1] || 'png',
      };
    }

    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: targetFolder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.warn(`Cloudinary upload failed, falling back to base64: ${error?.message}`);
            const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            return resolve({
              url: base64,
              publicId: `fallback-${Date.now()}`,
              provider: 'cloudinary',
              bytes: file.size,
              format: file.mimetype.split('/')[1] || 'png',
            });
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            provider: 'cloudinary',
            bytes: result.bytes,
            format: result.format,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      return res.result === 'ok';
    } catch {
      return false;
    }
  }
}
