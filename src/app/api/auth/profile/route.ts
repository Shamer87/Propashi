import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { getSession, signToken, setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Не авторизовано' }, { status: 401 });
    }

    const { username, newPassword } = await request.json();

    const user = await User.findById(session.userId);
    if (!user) {
      return Response.json({ error: 'Користувача не знайдено' }, { status: 404 });
    }

    // Зміна логіна
    if (username && username.trim().length >= 3) {
      if (username !== user.username) {
        const existing = await User.findOne({ username });
        if (existing) {
          return Response.json({ error: 'Цей логін вже зайнятий іншим користувачем' }, { status: 400 });
        }
        user.username = username.trim();
      }
    }

    // Зміна пароля
    if (newPassword && newPassword.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    } else if (newPassword && newPassword.trim().length > 0 && newPassword.trim().length < 6) {
      return Response.json({ error: 'Пароль повинен містити мінімум 6 символів' }, { status: 400 });
    }

    await user.save();

    // Оновлюємо токен сесії з новим логіном
    const token = await signToken({ userId: user._id.toString(), role: user.role, username: user.username });
    await setSession(token);

    return Response.json({ success: true, username: user.username });
  } catch (error) {
    console.error('Profile update error:', error);
    return Response.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}

import Person from '@/models/Person';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId).select('-passwordHash').lean();
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch records submitted by this user
    const records = await Person.find({ submittedBy: session.userId })
      .select('fullName status dateOfEvent isApproved createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ user, records });
  } catch (error) {
    console.error('GET /api/auth/profile error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
