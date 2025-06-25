import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface VideoFormatValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  metadata?: VideoMetadata;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  aspectRatio: string;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  fileSize: number;
}

@Injectable()
export class VideoFormatService {
  
  /**
   * Instagram video requirements
   */
  private readonly INSTAGRAM_REQUIREMENTS = {
    REELS: {
      maxDuration: 900, // 15 minutes
      minDuration: 3,
      maxFileSize: 300 * 1024 * 1024, // 300MB
      recommendedAspectRatio: '9:16',
      maxWidth: 1920,
      maxHeight: 1920,
      maxFrameRate: 60,
      minFrameRate: 23,
      maxVideoBitrate: 25 * 1024 * 1024, // 25Mbps
      maxAudioBitrate: 128 * 1024, // 128kbps
      supportedVideoCodecs: ['h264', 'hevc'],
      supportedAudioCodecs: ['aac'],
      supportedContainers: ['mp4', 'mov']
    },
    STORIES: {
      maxDuration: 60,
      minDuration: 3,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      recommendedAspectRatio: '9:16',
      maxWidth: 1920,
      maxFrameRate: 60,
      minFrameRate: 23,
      maxVideoBitrate: 25 * 1024 * 1024,
      maxAudioBitrate: 128 * 1024,
      supportedVideoCodecs: ['h264', 'hevc'],
      supportedAudioCodecs: ['aac'],
      supportedContainers: ['mp4', 'mov']
    },
    FEED: {
      maxDuration: 60,
      minDuration: 3,
      maxFileSize: 100 * 1024 * 1024,
      supportedAspectRatios: ['1:1', '4:5', '16:9'],
      maxWidth: 1920,
      maxFrameRate: 60,
      minFrameRate: 23,
      maxVideoBitrate: 25 * 1024 * 1024,
      maxAudioBitrate: 128 * 1024,
      supportedVideoCodecs: ['h264', 'hevc'],
      supportedAudioCodecs: ['aac'],
      supportedContainers: ['mp4', 'mov']
    }
  };

  /**
   * Extract video metadata using ffprobe
   */
  async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      
      const data = JSON.parse(stdout);
      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
      
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      const width = videoStream.width;
      const height = videoStream.height;
      const aspectRatio = this.calculateAspectRatio(width, height);
      
      return {
        duration: parseFloat(data.format.duration),
        width,
        height,
        frameRate: this.parseFrameRate(videoStream.r_frame_rate),
        aspectRatio,
        videoCodec: videoStream.codec_name,
        audioCodec: audioStream?.codec_name || 'none',
        bitrate: parseInt(data.format.bit_rate) || 0,
        fileSize: parseInt(data.format.size) || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to extract video metadata: ${error.message}`);
    }
  }

  /**
   * Validate video for Instagram posting
   */
  async validateForInstagram(filePath: string, postType: 'REELS' | 'STORIES' | 'FEED' = 'REELS'): Promise<VideoFormatValidation> {
    const metadata = await this.getVideoMetadata(filePath);
    const requirements = this.INSTAGRAM_REQUIREMENTS[postType];
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check duration
    if (metadata.duration > requirements.maxDuration) {
      issues.push(`Duration too long: ${metadata.duration.toFixed(1)}s (max: ${requirements.maxDuration}s)`);
      recommendations.push(`Trim video to under ${requirements.maxDuration} seconds`);
    }
    
    if (metadata.duration < requirements.minDuration) {
      issues.push(`Duration too short: ${metadata.duration.toFixed(1)}s (min: ${requirements.minDuration}s)`);
      recommendations.push(`Extend video to at least ${requirements.minDuration} seconds`);
    }

    // Check file size
    if (metadata.fileSize > requirements.maxFileSize) {
      const sizeMB = (metadata.fileSize / (1024 * 1024)).toFixed(1);
      const maxSizeMB = (requirements.maxFileSize / (1024 * 1024)).toFixed(0);
      issues.push(`File size too large: ${sizeMB}MB (max: ${maxSizeMB}MB)`);
      recommendations.push(`Compress video or reduce quality`);
    }

    // Check video codec
    if (!requirements.supportedVideoCodecs.includes(metadata.videoCodec.toLowerCase())) {
      issues.push(`Unsupported video codec: ${metadata.videoCodec}`);
      recommendations.push(`Convert to H.264 codec`);
    }

    // Check audio codec
    if (metadata.audioCodec !== 'none' && !requirements.supportedAudioCodecs.includes(metadata.audioCodec.toLowerCase())) {
      issues.push(`Unsupported audio codec: ${metadata.audioCodec}`);
      recommendations.push(`Convert to AAC audio codec`);
    }

    // Check frame rate
    if (metadata.frameRate > requirements.maxFrameRate) {
      issues.push(`Frame rate too high: ${metadata.frameRate}fps (max: ${requirements.maxFrameRate}fps)`);
      recommendations.push(`Reduce frame rate to 30fps or lower`);
    }
    
    if (metadata.frameRate < requirements.minFrameRate) {
      issues.push(`Frame rate too low: ${metadata.frameRate}fps (min: ${requirements.minFrameRate}fps)`);
      recommendations.push(`Increase frame rate to at least ${requirements.minFrameRate}fps`);
    }

    // Check dimensions
    if (metadata.width > requirements.maxWidth) {
      issues.push(`Width too large: ${metadata.width}px (max: ${requirements.maxWidth}px)`);
      recommendations.push(`Resize video width to ${requirements.maxWidth}px or less`);
    }

    // Check aspect ratio for specific post types
    if (postType === 'REELS' || postType === 'STORIES') {
      const reelsReqs = requirements as typeof this.INSTAGRAM_REQUIREMENTS.REELS;
      if (metadata.aspectRatio !== reelsReqs.recommendedAspectRatio) {
        issues.push(`Non-optimal aspect ratio: ${metadata.aspectRatio} (recommended: ${reelsReqs.recommendedAspectRatio})`);
        recommendations.push(`Convert to ${reelsReqs.recommendedAspectRatio} aspect ratio (e.g., 1080x1920)`);
      }
    }

    // Check bitrate
    if (metadata.bitrate > requirements.maxVideoBitrate) {
      const bitrateMbps = (metadata.bitrate / (1024 * 1024)).toFixed(1);
      const maxBitrateMbps = (requirements.maxVideoBitrate / (1024 * 1024)).toFixed(0);
      issues.push(`Bitrate too high: ${bitrateMbps}Mbps (max: ${maxBitrateMbps}Mbps)`);
      recommendations.push(`Reduce video bitrate`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      metadata
    };
  }

  /**
   * Convert video to Instagram-compatible format
   */
  async convertForInstagram(
    inputPath: string, 
    outputPath: string, 
    postType: 'REELS' | 'STORIES' | 'FEED' = 'REELS'
  ): Promise<void> {
    const requirements = this.INSTAGRAM_REQUIREMENTS[postType];
    
    // Base ffmpeg command for Instagram optimization
    let ffmpegCmd = `ffmpeg -i "${inputPath}"`;
    
    // Video encoding settings
    ffmpegCmd += ` -c:v libx264 -profile:v high -level 4.0`;
    ffmpegCmd += ` -pix_fmt yuv420p -movflags +faststart`;
    
    // Set optimal resolution and aspect ratio
    if (postType === 'REELS' || postType === 'STORIES') {
      ffmpegCmd += ` -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"`;
    } else if (postType === 'FEED') {
      ffmpegCmd += ` -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black"`;
    }
    
    // Video quality settings
    ffmpegCmd += ` -crf 23 -maxrate 8M -bufsize 16M`;
    
    // Frame rate
    ffmpegCmd += ` -r 30`;
    
    // Audio settings
    ffmpegCmd += ` -c:a aac -ar 44100 -b:a 128k -ac 2`;
    
    // Duration limit
    if (requirements.maxDuration < 900) {
      ffmpegCmd += ` -t ${requirements.maxDuration}`;
    }
    
    // Output file
    ffmpegCmd += ` -y "${outputPath}"`;
    
    try {
      console.log(`Converting video for Instagram: ${ffmpegCmd}`);
      await execAsync(ffmpegCmd);
      console.log(`Video conversion completed: ${outputPath}`);
    } catch (error: any) {
      throw new Error(`Video conversion failed: ${error.message}`);
    }
  }

  /**
   * Quick fix for common Instagram video issues
   */
  async quickFix(inputPath: string, outputPath: string): Promise<void> {
    const ffmpegCmd = `ffmpeg -i "${inputPath}" ` +
      `-c:v libx264 -profile:v high -level 4.0 ` +
      `-pix_fmt yuv420p -movflags +faststart ` +
      `-crf 23 -maxrate 8M -bufsize 16M ` +
      `-r 30 -c:a aac -ar 44100 -b:a 128k -ac 2 ` +
      `-y "${outputPath}"`;
    
    try {
      console.log(`Quick fixing video for Instagram: ${ffmpegCmd}`);
      await execAsync(ffmpegCmd);
      console.log(`Video quick fix completed: ${outputPath}`);
    } catch (error: any) {
      throw new Error(`Video quick fix failed: ${error.message}`);
    }
  }

  private calculateAspectRatio(width: number, height: number): string {
    const gcd = this.greatestCommonDivisor(width, height);
    const ratioWidth = width / gcd;
    const ratioHeight = height / gcd;
    return `${ratioWidth}:${ratioHeight}`;
  }

  private greatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }

  private parseFrameRate(frameRateStr: string): number {
    if (frameRateStr.includes('/')) {
      const [num, den] = frameRateStr.split('/').map(Number);
      return num / den;
    }
    return parseFloat(frameRateStr);
  }
} 