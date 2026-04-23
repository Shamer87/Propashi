import mongoose, { Schema, Document } from 'mongoose';
export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  telegramChatId?: string;
  telegramLinkToken?: string;
  createdAt: Date;
}
const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], default: 'USER' },
  telegramChatId: { type: String },
  telegramLinkToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});
if (mongoose.models.User) {
  delete mongoose.models.User;
}
const User = mongoose.model<IUser>('User', UserSchema);
export default User;