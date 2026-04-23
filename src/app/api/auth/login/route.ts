import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { signToken, setSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { username, password } = await request.json();
    if (!username || !password) {
      return Response.json({ error: 'Логін та пароль обов\'язкові' }, { status: 400 });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return Response.json({ error: 'Невірний логін або пароль' }, { status: 401 });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return Response.json({ error: 'Невірний логін або пароль' }, { status: 401 });
    }
    const token = await signToken({ userId: user._id.toString(), role: user.role, username: user.username });
    await setSession(token);
    return Response.json({ success: true, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}