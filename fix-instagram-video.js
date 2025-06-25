#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = './uploads';
const PROBLEMATIC_VIDEO = '7fe73e5b3c8ee4b172be13b71047e34010.mp4';

console.log('🔧 Instagram Video Format Fixer');
console.log('================================');

function findVideoFile() {
  const videoPath = path.join(UPLOADS_DIR, '2025/06/25', PROBLEMATIC_VIDEO);
  if (fs.existsSync(videoPath)) {
    return videoPath;
  }
  
  // Search recursively
  function searchDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        const found = searchDir(fullPath);
        if (found) return found;
      } else if (file.name === PROBLEMATIC_VIDEO) {
        return fullPath;
      }
    }
    return null;
  }
  
  return searchDir(UPLOADS_DIR);
}

function analyzeVideo(videoPath) {
  console.log(`\n📋 Analyzing video: ${videoPath}`);
  
  try {
    const result = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`, 
      { encoding: 'utf8' });
    
    const data = JSON.parse(result);
    const videoStream = data.streams.find(s => s.codec_type === 'video');
    const audioStream = data.streams.find(s => s.codec_type === 'audio');
    
    const analysis = {
      duration: parseFloat(data.format.duration),
      width: videoStream.width,
      height: videoStream.height,
      frameRate: eval(videoStream.r_frame_rate), // Convert fraction to decimal
      videoCodec: videoStream.codec_name,
      audioCodec: audioStream?.codec_name || 'none',
      bitrate: parseInt(data.format.bit_rate) || 0,
      fileSize: parseInt(data.format.size) || 0,
      aspectRatio: `${videoStream.width}:${videoStream.height}`
    };
    
    console.log('📊 Video Analysis:');
    console.log(`   📐 Resolution: ${analysis.width}x${analysis.height} (${analysis.aspectRatio})`);
    console.log(`   ⏱️  Duration: ${analysis.duration.toFixed(1)}s`);
    console.log(`   🎬 Frame Rate: ${analysis.frameRate.toFixed(2)}fps`);
    console.log(`   🎥 Video Codec: ${analysis.videoCodec}`);
    console.log(`   🔊 Audio Codec: ${analysis.audioCodec}`);
    console.log(`   📊 Bitrate: ${(analysis.bitrate / 1000000).toFixed(1)}Mbps`);
    console.log(`   📦 File Size: ${(analysis.fileSize / 1024 / 1024).toFixed(1)}MB`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Failed to analyze video:', error.message);
    return null;
  }
}

function checkInstagramCompatibility(analysis) {
  console.log('\n✅ Instagram Compatibility Check:');
  
  const issues = [];
  const requirements = {
    maxDuration: 900, // 15 minutes for reels
    minDuration: 3,
    maxFileSize: 300 * 1024 * 1024, // 300MB
    maxWidth: 1920,
    maxFrameRate: 60,
    minFrameRate: 23,
    maxBitrate: 25 * 1024 * 1024, // 25Mbps
    preferredAspectRatio: '9:16'
  };
  
  // Check duration
  if (analysis.duration > requirements.maxDuration) {
    issues.push(`❌ Duration too long: ${analysis.duration.toFixed(1)}s (max: ${requirements.maxDuration}s)`);
  } else if (analysis.duration < requirements.minDuration) {
    issues.push(`❌ Duration too short: ${analysis.duration.toFixed(1)}s (min: ${requirements.minDuration}s)`);
  } else {
    console.log(`   ✅ Duration: ${analysis.duration.toFixed(1)}s (OK)`);
  }
  
  // Check file size
  if (analysis.fileSize > requirements.maxFileSize) {
    const sizeMB = (analysis.fileSize / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (requirements.maxFileSize / (1024 * 1024)).toFixed(0);
    issues.push(`❌ File size too large: ${sizeMB}MB (max: ${maxSizeMB}MB)`);
  } else {
    console.log(`   ✅ File Size: ${(analysis.fileSize / 1024 / 1024).toFixed(1)}MB (OK)`);
  }
  
  // Check video codec
  if (analysis.videoCodec.toLowerCase() !== 'h264') {
    issues.push(`❌ Video codec not optimal: ${analysis.videoCodec} (preferred: H.264)`);
  } else {
    console.log(`   ✅ Video Codec: ${analysis.videoCodec} (OK)`);
  }
  
  // Check audio codec
  if (analysis.audioCodec !== 'none' && analysis.audioCodec.toLowerCase() !== 'aac') {
    issues.push(`❌ Audio codec not optimal: ${analysis.audioCodec} (preferred: AAC)`);
  } else {
    console.log(`   ✅ Audio Codec: ${analysis.audioCodec} (OK)`);
  }
  
  // Check frame rate
  if (analysis.frameRate > requirements.maxFrameRate) {
    issues.push(`❌ Frame rate too high: ${analysis.frameRate.toFixed(2)}fps (max: ${requirements.maxFrameRate}fps)`);
  } else if (analysis.frameRate < requirements.minFrameRate) {
    issues.push(`❌ Frame rate too low: ${analysis.frameRate.toFixed(2)}fps (min: ${requirements.minFrameRate}fps)`);
  } else {
    console.log(`   ✅ Frame Rate: ${analysis.frameRate.toFixed(2)}fps (OK)`);
  }
  
  // Check dimensions
  if (analysis.width > requirements.maxWidth) {
    issues.push(`❌ Width too large: ${analysis.width}px (max: ${requirements.maxWidth}px)`);
  } else {
    console.log(`   ✅ Resolution: ${analysis.width}x${analysis.height} (OK)`);
  }
  
  // Check aspect ratio
  const currentRatio = analysis.width / analysis.height;
  const preferredRatio = 9 / 16;
  if (Math.abs(currentRatio - preferredRatio) > 0.01) {
    console.log(`   ⚠️  Aspect Ratio: ${analysis.aspectRatio} (Instagram prefers 9:16 for vertical content)`);
  } else {
    console.log(`   ✅ Aspect Ratio: ${analysis.aspectRatio} (Perfect for Instagram Reels!)`);
  }
  
  // Check bitrate
  if (analysis.bitrate > requirements.maxBitrate) {
    const bitrateMbps = (analysis.bitrate / (1024 * 1024)).toFixed(1);
    const maxBitrateMbps = (requirements.maxBitrate / (1024 * 1024)).toFixed(0);
    issues.push(`❌ Bitrate too high: ${bitrateMbps}Mbps (max: ${maxBitrateMbps}Mbps)`);
  } else {
    console.log(`   ✅ Bitrate: ${(analysis.bitrate / 1000000).toFixed(1)}Mbps (OK)`);
  }
  
  return issues;
}

function fixVideo(inputPath, outputPath) {
  console.log(`\n🔧 Creating Instagram-optimized version...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);
  
  // Instagram-optimized ffmpeg command
  const ffmpegCmd = [
    'ffmpeg',
    `-i "${inputPath}"`,
    '-c:v libx264',
    '-profile:v high',
    '-level 4.0',
    '-pix_fmt yuv420p',
    '-movflags +faststart',
    '-crf 23',
    '-maxrate 8M',
    '-bufsize 16M',
    '-r 30',
    '-c:a aac',
    '-ar 44100',
    '-b:a 128k',
    '-ac 2',
    '-avoid_negative_ts make_zero',
    '-fflags +genpts',
    `-y "${outputPath}"`
  ].join(' ');
  
  console.log('⚙️  Running optimization...');
  
  try {
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log('✅ Video optimization completed!');
    return true;
  } catch (error) {
    console.error('❌ Video optimization failed:', error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Searching for problematic video...');
  
  const videoPath = findVideoFile();
  if (!videoPath) {
    console.error(`❌ Video file ${PROBLEMATIC_VIDEO} not found in uploads directory`);
    process.exit(1);
  }
  
  console.log(`✅ Found video: ${videoPath}`);
  
  const analysis = analyzeVideo(videoPath);
  if (!analysis) {
    process.exit(1);
  }
  
  const issues = checkInstagramCompatibility(analysis);
  
  if (issues.length === 0) {
    console.log('\n🎉 Video is fully compatible with Instagram!');
    console.log('The issue might be related to:');
    console.log('   • Server accessibility (Instagram can\'t reach the URL)');
    console.log('   • Container metadata issues (subtle MP4 format problems)');
    console.log('   • Temporary Instagram API issues');
    console.log('\nRecommendation: Try re-encoding the video anyway to fix potential container issues.');
  } else {
    console.log('\n❌ Found compatibility issues:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  // Create fixed version regardless
  const outputPath = videoPath.replace('.mp4', '_instagram_fixed.mp4');
  const success = fixVideo(videoPath, outputPath);
  
  if (success) {
    console.log('\n📋 Next Steps:');
    console.log('1. Replace the original video with the fixed version');
    console.log('2. Update the database/media references if needed');
    console.log('3. Try posting to Instagram again');
    console.log('\n💡 The fixed video has optimized container metadata and encoding settings');
    console.log('   that should resolve most Instagram compatibility issues.');
    
    // Analyze the fixed video
    console.log('\n🔍 Analyzing fixed video...');
    const fixedAnalysis = analyzeVideo(outputPath);
    if (fixedAnalysis) {
      checkInstagramCompatibility(fixedAnalysis);
    }
  }
}

// Check if ffmpeg is available
try {
  execSync('ffmpeg -version > /dev/null 2>&1');
} catch (error) {
  console.error('❌ ffmpeg is not installed or not available in PATH');
  console.error('Please install ffmpeg first: https://ffmpeg.org/download.html');
  process.exit(1);
}

main(); 