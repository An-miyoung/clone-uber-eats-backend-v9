import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly configService: ConfigService) {}
  @Post('')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const BUCKET_NAME = this.configService.get('AWS_BUCKET_NAME');
    AWS.config.update({
      credentials: {
        accessKeyId: this.configService.get('AWS_S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get('AWS_S3_SECRET_ACCESS_KEY'),
      },
    });
    try {
      // 최초 1번만
      // const upload = await new AWS.S3()
      //   .createBucket({
      //     Bucket: BUCKET_NAME,
      //   })
      //   .promise();
      const objectName = `${Date.now() + file.originalname}`;
      await new AWS.S3()
        .putObject({
          Body: file.buffer,
          Bucket: `${BUCKET_NAME}/restaurant-coverImg`,
          Key: objectName,
          ACL: 'public-read',
        })
        .promise();
      const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/restaurant-coverImg/${objectName}`;
      return { url: fileUrl };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
