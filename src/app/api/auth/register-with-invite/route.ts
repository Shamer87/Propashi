import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Invite from '@/models/Invite';
import { signToken, setSession } from '@/lib/auth';
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { token, username, password } = await request.json();
    if (!token || !username || !password) {
      return Response.json({ error: 'Заповніть всі поля' }, { status: 400 });
    }
    const invite = await Invite.findOne({ token, isUsed: false, expiresAt: { $gt: new Date() } });
    if (!invite) {
      return Response.json({ error: 'Запрошення недійсне, використане або прострочене.' }, { status: 400 });
    }
    if (username.length < 3) {
      return Response.json({ error: 'Логін мінімум 3 символи' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Пароль мінімум 6 символів' }, { status: 400 });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return Response.json({ error: 'Логін вже зайнятий' }, { status: 400 });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({
      username,
      passwordHash,
      role: invite.role
    });
    invite.isUsed = true;
    await invite.save();
    const jwt = await signToken({ userId: user._id.toString(), role: user.role, username: user.username });
    await setSession(jwt);
    return Response.json({ success: true, role: user.role }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ error: String(error) || 'Server error' }, { status: 500 });
  }
}