import { NextRequest, NextResponse } from 'next/server';
import bot from '@/lib/bot';

// Specify that this API route should use edge or serverless appropriately.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming Telegram update
    const update = await request.json();

    // Process the update through our Telegraf bot instance
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // We return 200 even on error to prevent Telegram from infinitely retrying
    // unless it's a critical error where retry is expected.
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Telegram Webhook endpoint is active.' });
}