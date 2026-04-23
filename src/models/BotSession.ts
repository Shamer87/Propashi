import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBotSession extends Document {
  chatId: number;
  step: string;
  data: {
    fullName: string;
    status: string;
    dob: string;
    unit: string;
    dateOfEvent: string;
    locationOfEvent: string;
    extraInfo: string;
  };
}

const BotSessionSchema = new Schema<IBotSession>({
  chatId: { type: Number, required: true, unique: true },
  step: { type: String, required: true },
  data: {
    fullName: { type: String, default: '' },
    status: { type: String, default: '' },
    dob: { type: String, default: '' },
    unit: { type: String, default: '' },
    dateOfEvent: { type: String, default: '' },
    locationOfEvent: { type: String, default: '' },
    extraInfo: { type: String, default: '' }
  }
}, { timestamps: true });

export default (mongoose.models.BotSession as Model<IBotSession>) || mongoose.model<IBotSession>('BotSession', BotSessionSchema);