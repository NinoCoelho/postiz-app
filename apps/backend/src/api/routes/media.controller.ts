import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ApiTags } from '@nestjs/swagger';
import handleR2Upload from '@gitroom/nestjs-libraries/upload/r2.uploader';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomFileValidationPipe } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { VideoFormatService } from '@gitroom/nestjs-libraries/upload/video.format.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@ApiTags('Media')
@Controller('/media')
export class MediaController {
  private storage = UploadFactory.createStorage();
  private videoFormatService = new VideoFormatService();
  
  constructor(
    private _mediaService: MediaService,
    private _subscriptionService: SubscriptionService
  ) {}

  @Delete('/:id')
  deleteMedia(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._mediaService.deleteMedia(org.id, id);
  }
  @Post('/generate-image')
  async generateImage(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body('prompt') prompt: string,
    isPicturePrompt = false
  ) {
    const total = await this._subscriptionService.checkCredits(org);
    if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
      return false;
    }

    return {
      output:
        (isPicturePrompt ? '' : 'data:image/png;base64,') +
        (await this._mediaService.generateImage(prompt, org, isPicturePrompt)),
    };
  }

  @Post('/generate-image-with-prompt')
  async generateImageFromText(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body('prompt') prompt: string
  ) {
    const image = await this.generateImage(org, req, prompt, true);
    if (!image) {
      return false;
    }

    const file = await this.storage.uploadSimple(image.output);

    return this._mediaService.saveFile(org.id, file.split('/').pop(), file);
  }

  private async createTempFileIfNeeded(file: Express.Multer.File): Promise<{ filePath: string; shouldCleanup: boolean }> {
    if (file.path && fs.existsSync(file.path)) {
      return { filePath: file.path, shouldCleanup: false };
    }

    // Create temporary file from buffer
    const tempDir = os.tmpdir();
    const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, file.buffer);
    
    return { filePath: tempFilePath, shouldCleanup: true };
  }

  private async cleanupTempFile(filePath: string, shouldCleanup: boolean): Promise<void> {
    if (shouldCleanup && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to clean up temporary file: ${error}`);
      }
    }
  }

  @Post('/upload-server')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new CustomFileValidationPipe())
  async uploadServer(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile() file: Express.Multer.File
  ) {
    let processedFile = file;
    let tempFileInfo: { filePath: string; shouldCleanup: boolean } | null = null;
    
    // Check if file is a video that might need processing for Instagram
    if (this.isVideoFile(file)) {
      console.log(`📹 Video upload detected: ${file.originalname}`);
      
      try {
        // Create temp file if needed for video processing
        tempFileInfo = await this.createTempFileIfNeeded(file);
        
        // Analyze if video meets Instagram standards
        const validation = await this.videoFormatService.validateForInstagram(tempFileInfo.filePath, 'REELS');
        
        if (!validation.isValid) {
          console.log(`🔧 Video needs processing for Instagram compatibility`);
          console.log(`Issues found: ${validation.issues.join(', ')}`);
          
          // Generate processed file path
          const tempDir = path.dirname(tempFileInfo.filePath);
          const originalName = path.parse(file.originalname);
          const processedPath = path.join(tempDir, `processed_${originalName.name}.mp4`);
          
          // Process video for Instagram compatibility
          await this.videoFormatService.convertForInstagram(tempFileInfo.filePath, processedPath, 'REELS');
          
          // Read processed file and create new file object
          const processedBuffer = fs.readFileSync(processedPath);
          const processedStats = fs.statSync(processedPath);
          processedFile = {
            ...file,
            buffer: processedBuffer,
            filename: `processed_${originalName.name}.mp4`,
            originalname: `processed_${originalName.name}.mp4`,
            size: processedStats.size,
          };
          
          console.log(`✅ Video processed successfully: ${processedFile.originalname}`);
          
          // Clean up processed file
          try {
            fs.unlinkSync(processedPath);
          } catch (error) {
            console.warn(`⚠️ Failed to clean up processed file: ${error}`);
          }
        } else {
          console.log(`✅ Video already Instagram compatible, no processing needed`);
        }
      } catch (error: any) {
        console.error(`❌ Video processing failed:`, error.message);
        console.log(`📤 Uploading original file instead`);
        // Continue with original file if processing fails
      } finally {
        // Clean up temp file if it was created
        if (tempFileInfo) {
          await this.cleanupTempFile(tempFileInfo.filePath, tempFileInfo.shouldCleanup);
        }
      }
    }
    
    const uploadedFile = await this.storage.uploadFile(processedFile);
    
    return this._mediaService.saveFile(
      org.id,
      uploadedFile.originalname,
      uploadedFile.path
    );
  }
  
  private isVideoFile(file: Express.Multer.File): boolean {
    const videoMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm'
    ];
    return videoMimeTypes.includes(file.mimetype);
  }

  @Post('/upload-simple')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSimple(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile('file') file: Express.Multer.File
  ) {
    let processedFile = file;
    let tempFileInfo: { filePath: string; shouldCleanup: boolean } | null = null;
    
    // Check if file is a video that might need processing for Instagram
    if (this.isVideoFile(file)) {
      console.log(`📹 Video upload detected (simple): ${file.originalname}`);
      
      try {
        // Create temp file if needed for video processing
        tempFileInfo = await this.createTempFileIfNeeded(file);
        
        const validation = await this.videoFormatService.validateForInstagram(tempFileInfo.filePath, 'REELS');
        
        if (!validation.isValid) {
          console.log(`🔧 Video needs processing for Instagram compatibility`);
          console.log(`Issues found: ${validation.issues.join(', ')}`);
          
          // Generate processed file path
          const tempDir = path.dirname(tempFileInfo.filePath);
          const originalName = path.parse(file.originalname);
          const processedPath = path.join(tempDir, `processed_${originalName.name}.mp4`);
          
          // Process video for Instagram compatibility
          await this.videoFormatService.convertForInstagram(tempFileInfo.filePath, processedPath, 'REELS');
          
          // Read processed file and create new file object
          const processedBuffer = fs.readFileSync(processedPath);
          const processedStats = fs.statSync(processedPath);
          processedFile = {
            ...file,
            buffer: processedBuffer,
            filename: `processed_${originalName.name}.mp4`,
            originalname: `processed_${originalName.name}.mp4`,
            size: processedStats.size,
          };
          
          console.log(`✅ Video processed successfully: ${processedFile.originalname}`);
          
          // Clean up processed file
          try {
            fs.unlinkSync(processedPath);
          } catch (error) {
            console.warn(`⚠️ Failed to clean up processed file: ${error}`);
          }
        } else {
          console.log(`✅ Video already Instagram compatible, no processing needed`);
        }
      } catch (error: any) {
        console.error(`❌ Video processing failed:`, error.message);
        console.log(`📤 Uploading original file instead`);
      } finally {
        // Clean up temp file if it was created
        if (tempFileInfo) {
          await this.cleanupTempFile(tempFileInfo.filePath, tempFileInfo.shouldCleanup);
        }
      }
    }
    
    const getFile = await this.storage.uploadFile(processedFile);
    
    return this._mediaService.saveFile(
      org.id,
      getFile.originalname,
      getFile.path
    );
  }

  @Post('/:endpoint')
  async uploadFile(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Res() res: Response,
    @Param('endpoint') endpoint: string
  ) {
    const upload = await handleR2Upload(endpoint, req, res);
    if (endpoint !== 'complete-multipart-upload') {
      return upload;
    }

    // @ts-ignore
    const name = upload.Location.split('/').pop();

    const saveFile = await this._mediaService.saveFile(
      org.id,
      name,
      // @ts-ignore
      upload.Location
    );

    res.status(200).json({ ...upload, saved: saveFile });
  }

  @Get('/')
  getMedia(
    @GetOrgFromRequest() org: Organization,
    @Query('page') page: number
  ) {
    return this._mediaService.getMedia(org.id, page);
  }
}
