import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await User.findById(session.userId);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.telegramLinkToken = token;
    await user.save();
    return Response.json({ token });
  } catch (error) {
    console.error('Telegram link token generation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}