import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase, clearDatabase, getDatabaseStats } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    switch (action) {
      case 'seed':
        await seedDatabase();
        return NextResponse.json({ 
          success: true, 
          message: 'Database seeded successfully' 
        });
        
      case 'clear':
        await clearDatabase();
        return NextResponse.json({ 
          success: true, 
          message: 'Database cleared successfully' 
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "seed" or "clear"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Seed API Error:', error);
    return NextResponse.json(
      { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await getDatabaseStats();
    return NextResponse.json({
      success: true,
      stats,
      message: `Database contains ${stats.users} users, ${stats.chats} chats, and ${stats.messages} messages`
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get database statistics' },
      { status: 500 }
    );
  }
} 