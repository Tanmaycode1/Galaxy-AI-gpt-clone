import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
}

// Check if Cloudinary is properly configured
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name_here' &&
    process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key_here' &&
    process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret_here'
  );
}

// Test Cloudinary connection
export async function testCloudinaryConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary environment variables not configured' };
    }

    // Test the connection by getting account usage
    const result = await cloudinary.api.usage();
    console.log('Cloudinary connection successful:', result.credits);
    return { success: true };
  } catch (error) {
    console.error('Cloudinary connection test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Upload file to Cloudinary
export async function uploadFile(
  file: File,
  folder: string = 'chatgpt-clone'
): Promise<UploadResult> {
  try {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not properly configured. Please check your environment variables.');
    }

    // Convert File to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    console.log('Uploading to Cloudinary folder:', folder);

    // Upload to Cloudinary with appropriate settings based on file type
    const uploadOptions: any = {
      folder,
      resource_type: file.type === 'application/pdf' ? 'raw' : 'auto',
      type: 'upload', // Explicitly set upload type
    };

    // Only add image optimizations for image files
    if (file.type.startsWith('image/')) {
      uploadOptions.quality = 'auto:eco';
      uploadOptions.fetch_format = 'auto';
      uploadOptions.flags = 'progressive';
      uploadOptions.transformation = [
        {
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      ];
    }

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

    console.log('Cloudinary upload successful:', {
      public_id: result.public_id,
      url: result.secure_url,
      size: result.bytes
    });

    return {
      public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete file from Cloudinary
export async function deleteFile(publicId: string): Promise<void> {
  try {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not properly configured');
    }

    console.log('Deleting from Cloudinary:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary delete result:', result);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get optimized image URL with transformations
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}
): string {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not properly configured');
  }

  return cloudinary.url(publicId, {
    quality: options.quality || 'auto:good',
    fetch_format: options.format || 'auto',
    width: options.width,
    height: options.height,
    crop: 'fill',
    secure: true,
  });
}

// Validate file type and size
export function validateFile(file: File, allowedTypes: string[], maxSizeMB: number): {
  isValid: boolean;
  error?: string;
} {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Supported types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
}

export default cloudinary; 