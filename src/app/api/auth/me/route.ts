import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.role) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    return NextResponse.json({ 
      role: session.role, 
      userId: session.userId, 
      username: session.username 
    });
  } catch (error) {
    console.error('Auth Check Error:', error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
