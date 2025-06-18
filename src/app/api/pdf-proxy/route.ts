import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pdfUrl = searchParams.get('url');
    
    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 });
    }

    console.log('Proxying PDF:', pdfUrl);

    // Fetch the PDF from Cloudinary
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      console.log('Failed to fetch PDF:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: response.status });
    }

    // Get the PDF buffer
    const pdfBuffer = await response.arrayBuffer();

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('PDF proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 