import { S3Client, PutObjectCommand, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';
import axios from 'axios';

class S3Storage implements IUploadProvider {
  private _client: S3Client;

  constructor(
    private _endpoint: string,
    private _region: string,
    private _accessKey: string,
    private _secretKey: string,
    private _bucketName: string,
    private _publicUrl: string,
    private _forcePathStyle: boolean = true // MinIO requires path-style by default
  ) {
    this._client = new S3Client({
      endpoint: this._endpoint,
      region: this._region,
      credentials: {
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
      },
      forcePathStyle: this._forcePathStyle, // Required for MinIO
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });

    // Add middleware to handle custom headers if needed
    this._client.middlewareStack.add(
      (next) =>
        async (args): Promise<any> => {
          const request = args.request as RequestInit;

          // Clean up problematic headers for non-AWS S3 services
          const headers = request.headers as Record<string, string>;
          if (!this._endpoint.includes('amazonaws.com')) {
            delete headers['x-amz-checksum-crc32'];
            delete headers['x-amz-checksum-crc32c'];
            delete headers['x-amz-checksum-sha1'];
            delete headers['x-amz-checksum-sha256'];
            request.headers = headers;
          }

          return next(args);
        },
      { step: 'build', name: 'customS3Headers' }
    );
  }

  async uploadSimple(path: string): Promise<string> {
    try {
      const loadImage = await axios.get(path, { responseType: 'arraybuffer' });
      const contentType =
        loadImage?.headers?.['content-type'] ||
        loadImage?.headers?.['Content-Type'] ||
        'application/octet-stream';
      
      const extension = getExtension(contentType) || 'bin';
      const id = makeId(10);
      const fileName = `${id}.${extension}`;

      const params = {
        Bucket: this._bucketName,
        Key: fileName,
        Body: loadImage.data,
        ContentType: contentType,
        ...(this._forcePathStyle ? {} : { ACL: 'public-read' as ObjectCannedACL }), // ACL only for AWS S3
      };

      const command = new PutObjectCommand(params);
      await this._client.send(command);

      // Return the public URL
      const publicUrl = this._publicUrl.endsWith('/')
        ? this._publicUrl.slice(0, -1)
        : this._publicUrl;
      
      return `${publicUrl}/${fileName}`;
    } catch (error: any) {
      console.error('S3Storage uploadSimple error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const id = makeId(10);
      const extension = mime.extension(file.mimetype) || 'bin';
      const fileName = `${id}.${extension}`;

      const params = {
        Bucket: this._bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ...(this._forcePathStyle ? {} : { ACL: 'public-read' as ObjectCannedACL }), // ACL only for AWS S3
      };

      const command = new PutObjectCommand(params);
      await this._client.send(command);

      // Return the public URL
      const publicUrl = this._publicUrl.endsWith('/')
        ? this._publicUrl.slice(0, -1)
        : this._publicUrl;
      
      const fileUrl = `${publicUrl}/${fileName}`;

      return {
        filename: fileName,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        originalname: fileName,
        fieldname: 'file',
        path: fileUrl,
        destination: fileUrl,
        encoding: '7bit',
        stream: file.buffer as any,
      };
    } catch (error: any) {
      console.error('S3Storage uploadFile error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async removeFile(filePath: string): Promise<void> {
    try {
      // Extract filename from URL
      const fileName = filePath.split('/').pop();
      if (!fileName) {
        throw new Error('Invalid file path provided');
      }

      const params = {
        Bucket: this._bucketName,
        Key: fileName,
      };

      const command = new DeleteObjectCommand(params);
      await this._client.send(command);
      
      console.log(`Successfully deleted file: ${fileName}`);
    } catch (error: any) {
      console.error('S3Storage removeFile error:', error);
      throw new Error(`Failed to remove file: ${error.message}`);
    }
  }
}

export { S3Storage };
export default S3Storage; 