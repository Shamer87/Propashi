import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'BOT_TOKEN is missing' }, { status: 500 });
  }
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');
  if (!host) {
    return NextResponse.json({ error: 'Could not determine host' }, { status: 400 });
  }
  const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();
    if (data.ok) {
      return NextResponse.json({ success: true, message: `Webhook successfully set to ${webhookUrl}` });
    } else {
      return NextResponse.json({ success: false, error: data.description }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}