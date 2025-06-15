# Cloudinary Setup Guide

## Image Upload Configuration

Your ChatGPT Clone currently uses **local storage** for image uploads because Cloudinary isn't configured. Here's how to set up proper cloud storage:

## Option 1: Configure Cloudinary (Recommended)

### 1. Create Cloudinary Account
- Go to [cloudinary.com](https://cloudinary.com)
- Sign up for free account
- Access your dashboard

### 2. Get Your Credentials
From your Cloudinary dashboard, copy:
- **Cloud Name** (e.g., `dxxxxx`)
- **API Key** (e.g., `123456789012345`)
- **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Update Environment Variables
Create/update your `.env.local` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

**⚠️ Important**: Replace the placeholder values (`your_cloudinary_*_here`) with your actual credentials.

### 4. Restart Development Server
```bash
npm run dev
```

## Option 2: Use Local Storage (Current Setup)

If you prefer local storage, your images will be stored in `public/uploads/` folder. This works for development but has limitations:

### Limitations:
- ❌ Files lost when deploying to Vercel/Netlify
- ❌ No image optimization
- ❌ No CDN delivery
- ❌ Limited storage space

### Benefits:
- ✅ Works immediately
- ✅ No external dependencies
- ✅ Free

## Current Status

✅ **Image uploads are working with local storage**
✅ **Images display properly in chat**
✅ **Images saved in chat history**
✅ **Vision models can process images**

## Testing Image Upload

1. Select a vision-enabled model (GPT-4 Vision, Claude 3)
2. Click the 📎 attachment icon
3. Upload an image
4. Add text description
5. Send message

The image will be displayed in the chat and sent to the AI model for analysis.

## Troubleshooting

### Images not displaying?
- Check browser console for errors
- Ensure image file is valid format (JPEG, PNG, GIF, WebP)
- File size must be under 10MB

### Upload failing?
- Check file permissions in `public/uploads/`
- Ensure sufficient disk space
- Try smaller image file

## Production Deployment

For production, **strongly recommend using Cloudinary** because:
- Local files are not persistent on platforms like Vercel
- Better performance with CDN
- Automatic image optimization
- Reliable storage

Configure Cloudinary before deploying to production! 