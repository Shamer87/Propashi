import { NextRequest } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongoose';
import Invite from '@/models/Invite';
import User from '@/models/User'; // needed for ref
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return Response.json({ error: 'Доступ заборонено' }, { status: 403 });
    }

    // Auto-delete only expired invites
    await Invite.deleteMany({ expiresAt: { $lt: new Date() }, isUsed: false });

    const invites = await Invite.find().sort({ expiresAt: -1 }).lean();
    return Response.json({ data: invites });
  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession();
    
    if (!session || session.role !== 'ADMIN') {
      return Response.json({ error: 'Доступ заборонено. Тільки Адміністратор може генерувати запрошення.' }, { status: 403 });
    }

    const { role } = await request.json();
    if (!['MODERATOR', 'USER'].includes(role)) {
      return Response.json({ error: 'Недійсна роль' }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const invite = await Invite.create({
      token,
      role,
      isUsed: false,
      createdBy: session.userId as any,
      expiresAt
    });

    return Response.json({ data: invite }, { status: 201 });
  } catch (error) {
    console.error('Invite generation error:', error);
    return Response.json({ error: String(error) || 'Помилка генерації' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return Response.json({ error: 'Доступ заборонено' }, { status: 403 });
    }

    const { id } = await request.json();
    await Invite.findByIdAndDelete(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
