import { NextRequest } from 'next/server';
import bot from '@/lib/bot';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret');
    const body = await request.json();
    await bot.handleUpdate(body);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Bot Webhook Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}