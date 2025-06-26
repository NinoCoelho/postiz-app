import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { Integration } from '@prisma/client';

export class InstagramProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'instagram';
  name = 'Instagram\n(Facebook Business)';
  isBetweenSteps = true;
  toolTip = 'Instagram must be business and connected to a Facebook page';
  scopes = [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
  ];

  /**
   * Validates and potentially reprocesses video for Instagram compatibility
   */
  private async validateAndProcessVideo(videoUrl: string): Promise<{ isValid: boolean; processedUrl?: string; error?: string }> {
    try {
      // Check if video is accessible
      const response = await fetch(videoUrl, { method: 'HEAD' });
      if (!response.ok) {
        return { isValid: false, error: `Video not accessible: HTTP ${response.status} - ${response.statusText}. Please check if the video URL is correct and accessible.` };
      }

      const contentType = response.headers.get('content-type');
      
      // Enhanced content type validation
      const isValidContentType = this.isValidVideoContentType(contentType, videoUrl);
      if (!isValidContentType.isValid) {
        return { isValid: false, error: isValidContentType.error };
      }

      console.log(`✅ Video validation passed for: ${videoUrl} (Content-Type: ${contentType || 'detected from URL'})`);
      
      // For now, return the original URL as valid
      // In the future, this could trigger video reprocessing if needed
      return { isValid: true, processedUrl: videoUrl };
    } catch (error: any) {
      return { isValid: false, error: `Video validation failed: ${error.message}. Please ensure the video is accessible from the internet.` };
    }
  }

  /**
   * Enhanced content type validation with fallback detection
   * Specifically handles cases where Caddy/nginx doesn't return content-type headers
   */
  private isValidVideoContentType(contentType: string | null, videoUrl: string): { isValid: boolean; error?: string } {
    console.log(`🔍 Validating video: ${videoUrl} with Content-Type: ${contentType || 'null/missing'}`);
    
    // If content-type is provided and valid, use it
    if (contentType) {
      const validVideoTypes = [
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi',
        'application/octet-stream', // Common for CDN files without proper MIME
        'application/mp4', // Alternative MP4 MIME type
        'video/mpeg', 'video/webm'
      ];
      
      const isValidMimeType = validVideoTypes.some(type => contentType.toLowerCase().includes(type));
      if (isValidMimeType) {
        console.log(`✅ Valid Content-Type detected: ${contentType}`);
        return { isValid: true };
      }
      
      // If content-type is provided but not a valid video type, continue to URL-based validation
      console.log(`⚠️ Unrecognized Content-Type: ${contentType}, falling back to URL validation`);
    }

    // Primary fallback: Check for video file extensions
    const urlLower = videoUrl.toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.quicktime', '.m4v', '.3gp', '.webm'];
    const hasVideoExtension = videoExtensions.some(ext => {
      return urlLower.includes(ext) && (urlLower.endsWith(ext) || urlLower.includes(ext + '?') || urlLower.includes(ext + '#'));
    });
    
    if (hasVideoExtension) {
      console.log(`✅ Video extension detected in URL: ${videoUrl}`);
      return { isValid: true };
    }

    // Secondary fallback: Check for video-related patterns in URL
    const videoPatterns = [
      'uploads',     // Common upload directory pattern
      'media',       // Media storage pattern
      'videos',      // Video storage pattern
      'assets',      // Asset storage pattern
      '/video/',     // Video path pattern
      'cdn',         // CDN patterns
      'storage'      // Storage patterns
    ];
    
    const hasVideoPattern = videoPatterns.some(pattern => urlLower.includes(pattern.toLowerCase()));
    if (hasVideoPattern && urlLower.includes('mp4')) {
      console.log(`✅ Video-like URL pattern detected: ${videoUrl}`);
      return { isValid: true };
    }

    // Final fallback: For specific domains that we know serve videos
    const trustedDomains = [
      'services.jornada.me',  // Your specific domain
      'amazonaws.com',        // S3
      'cloudfront.net',       // CloudFront
      'googleusercontent.com', // Google storage
      'blob.core.windows.net', // Azure storage
      'digitaloceanspaces.com' // DigitalOcean spaces
    ];
    
    const isTrustedDomain = trustedDomains.some(domain => urlLower.includes(domain));
    if (isTrustedDomain && (urlLower.includes('mp4') || urlLower.includes('video'))) {
      console.log(`✅ Trusted domain with video content detected: ${videoUrl}`);
      return { isValid: true };
    }

    // If all validations fail
    const errorMsg = `Unable to validate video format. Content-Type: ${contentType || 'missing'}, URL: ${videoUrl}. ` +
                    `This may be due to missing Content-Type headers from your CDN/server. ` +
                    `Please ensure the video is in MP4 format and your server returns proper Content-Type headers.`;
    
    console.log(`❌ Video validation failed: ${errorMsg}`);
    return { 
      isValid: false, 
      error: errorMsg
    };
  }

  /**
   * Enhanced error handling for Instagram video uploads
   */
  private handleInstagramVideoError(error: any, videoUrl: string): string {
    if (error?.json) {
      const errorData = JSON.parse(error.json);
      const fbError = errorData?.error;
      
      if (fbError?.code === 352 && fbError?.error_subcode === 2207026) {
        return `Instagram video format error: ${fbError.message}. ` +
               `Video URL: ${videoUrl}. ` +
               `This may be due to container format issues. Try re-encoding the video with standard settings: ` +
               `H.264 video codec, AAC audio, MP4 container, 9:16 aspect ratio (1080x1920), max 30fps.`;
      }
      
      if (fbError?.code === 352) {
        return `Instagram video upload error (${fbError.code}/${fbError.error_subcode}): ${fbError.message}`;
      }
    }
    
    return `Instagram video upload failed: ${error.message || 'Unknown error'}`;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<AuthTokenDetails> {
    const findPage = (await this.pages(accessToken)).find(
      (p) => p.id === requiredId
    );

    const information = await this.fetchPageInformation(accessToken, {
      id: requiredId,
      pageId: findPage?.pageId!,
    });

    return {
      id: information.id,
      name: information.name,
      accessToken: information.access_token,
      refreshToken: information.access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: information.picture,
      username: information.username,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url:
        'https://www.facebook.com/v20.0/dialog/oauth' +
        `?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.FRONTEND_URL}/integrations/social/instagram`
        )}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(this.scopes.join(','))}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const getAccessToken = await (
      await this.fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/instagram${
              params.refresh ? `?refresh=${params.refresh}` : ''
            }`
          )}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    const { access_token, expires_in, ...all } = await (
      await this.fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          '?grant_type=fb_exchange_token' +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${getAccessToken.access_token}`
      )
    ).json();

    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`
      )
    ).json();

    const permissions = data
      .filter((d: any) => d.status === 'granted')
      .map((p: any) => p.permission);
    this.checkScopes(this.scopes, permissions);

    const {
      id,
      name,
      picture: {
        data: { url },
      },
    } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`
      )
    ).json();

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: url,
      username: '',
    };
  }

  async pages(accessToken: string) {
    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,instagram_business_account,username,name,picture.type(large)&access_token=${accessToken}&limit=500`
      )
    ).json();

    const onlyConnectedAccounts = await Promise.all(
      data
        .filter((f: any) => f.instagram_business_account)
        .map(async (p: any) => {
          return {
            pageId: p.id,
            ...(await (
              await this.fetch(
                `https://graph.facebook.com/v20.0/${p.instagram_business_account.id}?fields=name,profile_picture_url&access_token=${accessToken}&limit=500`
              )
            ).json()),
            id: p.instagram_business_account.id,
          };
        })
    );

    return onlyConnectedAccounts.map((p: any) => ({
      pageId: p.pageId,
      id: p.id,
      name: p.name,
      picture: { data: { url: p.profile_picture_url } },
    }));
  }

  async fetchPageInformation(
    accessToken: string,
    data: { pageId: string; id: string }
  ) {
    const { access_token, ...all } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${data.pageId}?fields=access_token,name,picture.type(large)&access_token=${accessToken}`
      )
    ).json();

    const { id, name, profile_picture_url, username } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${data.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`
      )
    ).json();

    console.log(id, name, profile_picture_url, username);
    return {
      id,
      name,
      picture: profile_picture_url,
      access_token,
      username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration,
    type = 'graph.facebook.com'
  ): Promise<PostResponse[]> {
    try {
      const [firstPost, ...theRest] = postDetails;
      console.log('Instagram post in progress...');
      const isStory = firstPost.settings.post_type === 'story';
      
      // Validate videos before uploading
      if (firstPost?.media?.some(m => m.url.indexOf('.mp4') > -1)) {
        console.log('Validating Instagram video formats...');
        for (const media of firstPost.media.filter(m => m.url.indexOf('.mp4') > -1)) {
          const validation = await this.validateAndProcessVideo(media.url);
          if (!validation.isValid) {
            throw new Error(`Video validation failed: ${validation.error}`);
          }
          console.log(`Video validation passed for: ${media.url}`);
        }
      }
      
      const medias = await Promise.all(
        firstPost?.media?.map(async (m) => {
          const caption =
            firstPost.media?.length === 1
              ? `&caption=${encodeURIComponent(firstPost.message)}`
              : ``;
          const isCarousel =
            (firstPost?.media?.length || 0) > 1 ? `&is_carousel_item=true` : ``;
          const mediaType =
            m.url.indexOf('.mp4') > -1
              ? firstPost?.media?.length === 1
                ? isStory
                  ? `video_url=${m.url}&media_type=STORIES`
                  : `video_url=${m.url}&media_type=REELS`
                : isStory
                ? `video_url=${m.url}&media_type=STORIES`
                : `video_url=${m.url}&media_type=VIDEO`
              : isStory
              ? `image_url=${m.url}&media_type=STORIES`
              : `image_url=${m.url}`;
          console.log('Creating Instagram media container...');

          const collaborators =
            firstPost?.settings?.collaborators?.length && !isStory
              ? `&collaborators=${JSON.stringify(
                  firstPost?.settings?.collaborators.map((p) => p.label)
                )}`
              : ``;

          console.log('Collaborators:', collaborators);
          
          try {
            const { id: photoId } = await (
              await this.fetch(
                `https://${type}/v20.0/${id}/media?${mediaType}${isCarousel}${collaborators}&access_token=${accessToken}${caption}`,
                {
                  method: 'POST',
                }
              )
            ).json();
            console.log('Media container created:', photoId);

            let status = 'IN_PROGRESS';
            let attempts = 0;
            const maxAttempts = 40; // Maximum 120 seconds wait time (increased for S3/MinIO)
            
            while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
              try {
                const statusResponse = await this.fetch(
                  `https://${type}/v20.0/${photoId}?access_token=${accessToken}&fields=status_code`
                );
                const statusData = await statusResponse.json();
                
                // Check for errors in the response
                if (statusData.error) {
                  console.error('Instagram status check error:', statusData.error);
                  throw new Error(`Instagram API error: ${statusData.error.message}`);
                }
                
                status = statusData.status_code;
                attempts++;
                console.log(`Media processing status: ${status} (attempt ${attempts}/${maxAttempts})`);
                
                // If status is still IN_PROGRESS, wait before next check
                if (status === 'IN_PROGRESS') {
                  await timer(3000);
                }
              } catch (statusError: any) {
                console.error(`Status check failed (attempt ${attempts + 1}):`, statusError.message);
                attempts++;
                if (attempts >= maxAttempts) {
                  throw new Error(`Instagram status check failed after ${maxAttempts} attempts: ${statusError.message}`);  
                }
                await timer(5000); // Wait longer on error
              }
            }
            
            if (status === 'IN_PROGRESS') {
              throw new Error(`Instagram media processing timeout after ${maxAttempts * 3} seconds. This may be due to slow network connection to your S3/MinIO server.`);
            }
            
            if (status === 'ERROR') {
              // Try to get more detailed error information
              try {
                const errorResponse = await this.fetch(
                  `https://${type}/v20.0/${photoId}?access_token=${accessToken}&fields=status_code,error_description`
                );
                const errorData = await errorResponse.json();
                throw new Error(`Instagram media processing failed: ${errorData.error_description || 'Unknown error'}`);
              } catch {
                throw new Error('Instagram media processing failed');
              }
            }
            
            console.log('Media processing completed successfully');
            return photoId;
            
          } catch (uploadError) {
            // Enhanced error handling for video uploads
            if (m.url.indexOf('.mp4') > -1) {
              const errorMessage = this.handleInstagramVideoError(uploadError, m.url);
              console.error('Instagram video upload error:', errorMessage);
              throw new Error(errorMessage);
            }
            throw uploadError;
          }
        }) || []
      );

      const arr = [];

      let containerIdGlobal = '';
      let linkGlobal = '';
      if (medias.length === 1) {
        const { id: mediaId } = await (
          await this.fetch(
            `https://${type}/v20.0/${id}/media_publish?creation_id=${medias[0]}&access_token=${accessToken}&field=id`,
            {
              method: 'POST',
            }
          )
        ).json();

        containerIdGlobal = mediaId;

        const { permalink } = await (
          await this.fetch(
            `https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`
          )
        ).json();

        arr.push({
          id: firstPost.id,
          postId: mediaId,
          releaseURL: permalink,
          status: 'success',
        });

        linkGlobal = permalink;
      } else {
        const { id: containerId, ...all3 } = await (
          await this.fetch(
            `https://${type}/v20.0/${id}/media?caption=${encodeURIComponent(
              firstPost?.message
            )}&media_type=CAROUSEL&children=${encodeURIComponent(
              medias.join(',')
            )}&access_token=${accessToken}`,
            {
              method: 'POST',
            }
          )
        ).json();

        let status = 'IN_PROGRESS';
        while (status === 'IN_PROGRESS') {
          const { status_code } = await (
            await this.fetch(
              `https://${type}/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`
            )
          ).json();
          await timer(3000);
          status = status_code;
        }

        const { id: mediaId, ...all4 } = await (
          await this.fetch(
            `https://${type}/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}&field=id`,
            {
              method: 'POST',
            }
          )
        ).json();

        containerIdGlobal = mediaId;

        const { permalink } = await (
          await this.fetch(
            `https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`
          )
        ).json();

        arr.push({
          id: firstPost.id,
          postId: mediaId,
          releaseURL: permalink,
          status: 'success',
        });

        linkGlobal = permalink;
      }

      for (const post of theRest) {
        const { id: commentId } = await (
          await this.fetch(
            `https://${type}/v20.0/${containerIdGlobal}/comments?message=${encodeURIComponent(
              post.message
            )}&access_token=${accessToken}`,
            {
              method: 'POST',
            }
          )
        ).json();

        arr.push({
          id: firstPost.id,
          postId: commentId,
          releaseURL: linkGlobal,
          status: 'success',
        });
      }

      return arr;
    } catch (err: any) {
      // Enhanced error logging and handling
      console.error('Instagram post error:', {
        error: err.message,
        stack: err.stack,
        postDetailsCount: postDetails?.length || 0
      });
      
      // Re-throw the error instead of returning empty array
      throw err;
    }
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number,
    type = 'graph.facebook.com'
  ): Promise<AnalyticsData[]> {
    const until = dayjs().endOf('day').unix();
    const since = dayjs().subtract(date, 'day').unix();

    const { data, ...all } = await (
      await this.fetch(
        `https://${type}/v21.0/${id}/insights?metric=follower_count,reach&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    const { data: data2, ...all2 } = await (
      await this.fetch(
        `https://${type}/v21.0/${id}/insights?metric_type=total_value&metric=likes,views,comments,shares,saves,replies&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();
    const analytics = [];

    analytics.push(
      ...(data?.map((d: any) => ({
        label: d.title,
        percentageChange: 5,
        data: d.values.map((v: any) => ({
          total: v.value,
          date: dayjs(v.end_time).format('YYYY-MM-DD'),
        })),
      })) || [])
    );

    analytics.push(
      ...data2.map((d: any) => ({
        label: d.title,
        percentageChange: 5,
        data: [
          {
            total: d.total_value.value,
            date: dayjs().format('YYYY-MM-DD'),
          },
          {
            total: d.total_value.value,
            date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
          },
        ],
      }))
    );

    return analytics;
  }

  music(accessToken: string, data: { q: string }) {
    return this.fetch(
      `https://graph.facebook.com/v20.0/music/search?q=${encodeURIComponent(
        data.q
      )}&access_token=${accessToken}`
    );
  }
}
