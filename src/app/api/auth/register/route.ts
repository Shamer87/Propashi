import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { signToken, setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { username, password, secretCode } = await request.json();

    if (!username || !password || username.length < 3 || password.length < 6) {
      return Response.json({ error: 'Недійсні дані для реєстрації' }, { status: 400 });
    }

    const VALID_SECRET = process.env.ADMIN_SECRET_CODE || 'СЛАВА_УКРАЇНІ';
    if (secretCode !== VALID_SECRET) {
      return Response.json({ error: 'Невірний секретний код запрошення' }, { status: 403 });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return Response.json({ error: 'Користувач вже існує' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Make the first user an ADMIN, others MODERATOR by default in this MVP
    const count = await User.countDocuments();
    const role = count === 0 ? 'MODERATOR' : 'MODERATOR'; // For safety, everyone is moderator/viewer.

    const user = await User.create({
      username,
      passwordHash: hashedPassword,
      role: 'MODERATOR'
    });

    const token = await signToken({ userId: user._id, role: user.role, username: user.username });
    await setSession(token);

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
