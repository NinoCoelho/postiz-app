import XHRUpload from '@uppy/xhr-upload';
import AwsS3Multipart from '@uppy/aws-s3';
import sha256 from 'sha256';
const fetchUploadApiEndpoint = async (
  fetch: any,
  endpoint: string,
  data: any
) => {
  const res = await fetch(`/media/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return res.json();
};

// Define the factory to return appropriate Uppy configuration
export const getUppyUploadPlugin = (
  provider: string,
  fetch: any,
  backendUrl: string
) => {
  switch (provider) {
    case 'cloudflare':
      return {
        plugin: AwsS3Multipart,
        options: {
          shouldUseMultipart: (file: any) => true,
          endpoint: '',
          createMultipartUpload: async (file: any) => {
            let fileHash = '';
            const contentType = file.type;
            
            // Skip hash calculation for files larger than 100MB to avoid "Invalid array length" error
            if (file.size <= 100 * 1024 * 1024) {
              try {
                const arrayBuffer = await new Response(file.data).arrayBuffer();
                fileHash = sha256(Buffer.from(arrayBuffer));
              } catch (error) {
                console.warn('Failed to calculate file hash, proceeding without hash:', error);
                fileHash = '';
              }
            }
            
            return fetchUploadApiEndpoint(fetch, 'create-multipart-upload', {
              file,
              fileHash,
              contentType,
            });
          },
          listParts: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'list-parts', {
              file,
              ...props,
            }),
          signPart: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'sign-part', {
              file,
              ...props,
            }),
          abortMultipartUpload: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'abort-multipart-upload', {
              file,
              ...props,
            }),
          completeMultipartUpload: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'complete-multipart-upload', {
              file,
              ...props,
            }),
        },
      };
    case 'local':
      return {
        plugin: XHRUpload,
        options: {
          endpoint: `${backendUrl}/media/upload-server`,
          withCredentials: true,
        },
      };
    
    case 's3':
      return {
        plugin: XHRUpload,
        options: {
          endpoint: `${backendUrl}/media/upload-server`,
          withCredentials: true,
        },
      };

    // Add more cases for other cloud providers
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
};
