import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFile, isCloudinaryConfigured, validateFile } from '@/lib/cloudinary';
import { writeFile } from 'fs/promises';
import path from 'path';

// Convert PDF pages to images using Cloudinary
async function convertPdfToImages(file: File, maxPages: number = 10): Promise<{images: string[], totalPages: number}> {
  try {
    console.log('Converting PDF to images:', file.name, 'Size:', file.size);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // First, upload the PDF to get page count
    const pdfResult = await uploadFile(file, 'chatgpt-clone/temp');
    console.log('PDF uploaded, checking pages...');
    
    // Get PDF info to determine page count (Cloudinary provides this)
    const pdfInfo = await fetch(`https://res.cloudinary.com/dnuk9lses/image/upload/pg_1/${pdfResult.public_id}.jpg`);
    
    // For simplicity, let's assume most PDFs have 1-10 pages
    // In production, you'd use Cloudinary's API to get actual page count
    const estimatedPages = Math.min(maxPages, 10);
    
    const images: string[] = [];
    
    // Convert each page to an image using Cloudinary transformations
    for (let page = 1; page <= estimatedPages; page++) {
      try {
        const imageUrl = `https://res.cloudinary.com/dnuk9lses/image/upload/pg_${page},w_800,q_auto,f_auto/${pdfResult.public_id}.jpg`;
        
        // Test if page exists by trying to fetch it
        const testResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          images.push(imageUrl);
          console.log(`Page ${page} converted successfully`);
        } else {
          console.log(`Page ${page} not found, stopping conversion`);
          break;
        }
      } catch (error) {
        console.log(`Failed to convert page ${page}:`, error);
        break;
      }
    }
    
    // Clean up temporary PDF
    try {
      const { deleteFile } = await import('@/lib/cloudinary');
      await deleteFile(pdfResult.public_id);
    } catch (error) {
      console.log('Failed to clean up temp PDF:', error);
    }
    
    console.log(`PDF converted to ${images.length} images`);
    return { images, totalPages: images.length };
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    return { images: [], totalPages: 0 };
  }
}

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
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg', 'application/pdf'];
    const maxSizeMB = 50; // Increased for PDFs
    
    const validation = validateFile(file, validTypes, maxSizeMB);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    let result;
    
    if (isCloudinaryConfigured()) {
      // Upload regular files to Cloudinary
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
        const localResult = await uploadFileLocally(file);
        result = localResult;
      }
    } else {
      // Use local storage fallback
      console.log('Cloudinary not configured, using local storage');
      console.warn('⚠️  For production, please configure Cloudinary for reliable file storage');
      const localResult = await uploadFileLocally(file);
      result = localResult;
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