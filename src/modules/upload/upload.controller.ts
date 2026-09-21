import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../storage/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB Max File Size
      },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'video/mp4',
          'video/webm',
          'application/pdf',
        ];
        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'শুধুমাত্র ছবি (JPG, PNG, WebP), ভিডিও (MP4), বা PDF ফাইল আপলোড করা যাবে!',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'shunno-academy/receipts' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload file to storage (Cloudinary / Base64 fallback)' })
  async uploadFile(
    @UploadedFile() file: any,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please attach a file to upload!');
    }

    const result = await this.cloudinaryService.uploadFile(file, folder);
    return {
      message: 'File uploaded successfully',
      data: result,
    };
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete a file by public ID' })
  async deleteFile(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('publicId is required to delete a file');
    }

    const success = await this.cloudinaryService.deleteFile(publicId);
    return {
      message: success ? 'File deleted successfully' : 'File deletion failed',
      data: { success },
    };
  }
}
