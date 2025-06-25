import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
// @ts-ignore
import mime from 'mime';

async function* nodeStreamToIterator(stream: any) {
  for await (const chunk of stream) {
    yield chunk;
  }
}

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(new Uint8Array(value));
      }
    },
  });
}

export const GET = (
  request: NextRequest,
  context: {
    params: {
      path: string[];
    };
  }
) => {
  try {
    const filePath =
      process.env.UPLOAD_DIRECTORY + '/' + context.params.path.join('/');
    
    // Check if file exists first
    if (!existsSync(filePath)) {
      console.error(`🚨 [UPLOAD ERROR] File not found: ${filePath}`);
      return NextResponse.json(
        { 
          error: 'File not found',
          message: `The requested file does not exist: ${context.params.path.join('/')}`,
          path: context.params.path.join('/'),
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const fileStats = statSync(filePath);
    const contentType = mime.getType(filePath) || 'application/octet-stream';
    const response = createReadStream(filePath);
    
    const iterator = nodeStreamToIterator(response);
    const webStream = iteratorToStream(iterator);
    
    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
        'Last-Modified': fileStats.mtime.toUTCString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error(`🚨 [UPLOAD ERROR] Failed to serve file:`, {
      path: context.params.path.join('/'),
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    
    // Return detailed error response
    return NextResponse.json(
      {
        error: 'Failed to serve file',
        message: error.message,
        code: error.code,
        path: context.params.path.join('/'),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};
