import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFile, isCloudinaryConfigured, validateFile } from '@/lib/cloudinary';
import { writeFile } from 'fs/promises';
import path from 'path';

// Fallback local upload
async function uploadFileLocally(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Create unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2);
  const extension = path.extname(file.name);
  const filename = `${timestamp}_${randomId}${extension}`;
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  
  try {
    await writeFile(path.join(uploadsDir, filename), buffer);
  } catch (error) {
    // If uploads directory doesn't exist, create it and try again
    const { mkdir } = await import('fs/promises');
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), buffer);
  }
  
  return {
    url: `/uploads/${filename}`,
    publicId: filename,
    format: extension.slice(1),
    width: undefined,
    height: undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const authResult = auth();
    // Allow uploads in demo mode as well
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Upload request:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cloudinaryConfigured: isCloudinaryConfigured()
    });

    // Validate file type and size using the improved validation
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    const maxSizeMB = 10;
    
    const validation = validateFile(file, validTypes, maxSizeMB);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    let result;
    
    if (isCloudinaryConfigured()) {
      // Upload to Cloudinary
      console.log('Uploading to Cloudinary...');
      try {
        const cloudinaryResult = await uploadFile(file, 'chatgpt-clone/uploads');
        result = {
          url: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id,
          format: cloudinaryResult.format,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
        };
        console.log('Cloudinary upload successful:', result.url);
      } catch (error) {
        console.error('Cloudinary upload failed, falling back to local:', error);
        result = await uploadFileLocally(file);
      }
    } else {
      // Use local storage fallback
      console.log('Cloudinary not configured, using local storage');
      console.warn('⚠️  For production, please configure Cloudinary for reliable image storage');
      result = await uploadFileLocally(file);
    }

    console.log('Upload successful:', {
      url: result.url,
      publicId: result.publicId,
      format: result.format
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 