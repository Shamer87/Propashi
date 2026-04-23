import { NextRequest, NextResponse } from 'next/server';
import bot from '@/lib/bot';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 200 });
  }
}
export async function GET() {
  return NextResponse.json({ message: 'Telegram Webhook endpoint is active.' });
}