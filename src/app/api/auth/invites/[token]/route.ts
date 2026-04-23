import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Invite from '@/models/Invite';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await dbConnect();
    const { token } = await params;
    const invite = await Invite.findOne({ token }).lean();

    if (!invite) {
      return Response.json({ valid: false, error: 'Запрошення не знайдено' }, { status: 404 });
    }
    
    if (invite.isUsed) {
      return Response.json({ valid: false, error: 'Запрошення вже використане' }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return Response.json({ valid: false, error: 'Запрошення прострочене (діяло 24 години)' }, { status: 400 });
    }

    return Response.json({ valid: true, role: invite.role });
  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
