import { NextResponse } from 'next/server';
import { testCloudinaryConnection, isCloudinaryConfigured } from '@/lib/cloudinary';

export async function GET() {
  try {
    console.log('Testing Cloudinary configuration...');
    
    // Check if environment variables are set
    const envCheck = {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    };

    console.log('Environment variables check:', envCheck);

    if (!isCloudinaryConfigured()) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'Cloudinary environment variables are not properly configured',
        envCheck,
        instructions: [
          '1. Create a Cloudinary account at https://cloudinary.com/',
          '2. Go to your Cloudinary dashboard',
          '3. Copy your Cloud Name, API Key, and API Secret',
          '4. Add them to your .env.local file:',
          '   CLOUDINARY_CLOUD_NAME=your_cloud_name_here',
          '   CLOUDINARY_API_KEY=your_api_key_here',
          '   CLOUDINARY_API_SECRET=your_api_secret_here',
          '5. Restart your development server'
        ]
      }, { status: 400 });
    }

    // Test the connection
    const connectionTest = await testCloudinaryConnection();
    
    if (connectionTest.success) {
      return NextResponse.json({
        success: true,
        configured: true,
        message: 'Cloudinary is properly configured and connected!',
        envCheck,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      });
    } else {
      return NextResponse.json({
        success: false,
        configured: true,
        message: 'Cloudinary is configured but connection failed',
        error: connectionTest.error,
        envCheck,
        instructions: [
          '1. Verify your Cloudinary credentials are correct',
          '2. Check your internet connection',
          '3. Make sure your Cloudinary account is active',
          '4. Try regenerating your API credentials in Cloudinary dashboard'
        ]
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Cloudinary test error:', error);
    return NextResponse.json({
      success: false,
      configured: false,
      message: 'Error testing Cloudinary configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 