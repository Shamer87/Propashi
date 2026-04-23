import mongoose, { Schema, Document } from 'mongoose';
export interface IInvite extends Document {
  token: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isUsed: boolean;
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
}
const InviteSchema: Schema = new Schema({
  token: { type: String, required: true, unique: true },
  role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], required: true },
  isUsed: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true },
});
if (mongoose.models.Invite) {
  delete mongoose.models.Invite;
}
const Invite = mongoose.model<IInvite>('Invite', InviteSchema);
export default Invite;