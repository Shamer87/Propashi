import mongoose, { Schema, Document } from 'mongoose';
export interface IPerson extends Document {
  externalId?: string; 
  status: 'KILLED' | 'MISSING' | 'CAPTURED' | 'UNKNOWN';
  fullName: string;
  dob?: string;
  dobParsed?: Date;
  callsign?: string;
  jeton?: string;
  pob?: string; 
  unit?: string;
  dateOfEvent?: string;
  dateOfEventParsed?: Date;
  locationOfEvent?: string;
  direction?: string;
  placeOfResidence?: string;
  specialFeatures?: string;
  extraInfo?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  photos?: string[];
  submittedBy?: mongoose.Types.ObjectId;
  isApproved: boolean; 
  createdAt: Date;
  updatedAt: Date;
}
const PersonSchema: Schema = new Schema({
  externalId: { type: String },
  status: { type: String, enum: ['KILLED', 'MISSING', 'CAPTURED', 'UNKNOWN'], default: 'UNKNOWN' },
  fullName: { type: String, required: true },
  dob: { type: String },
  dobParsed: { type: Date },
  callsign: { type: String },
  jeton: { type: String },
  pob: { type: String },
  unit: { type: String },
  dateOfEvent: { type: String },
  dateOfEventParsed: { type: Date },
  locationOfEvent: { type: String },
  direction: { type: String },
  placeOfResidence: { type: String },
  specialFeatures: { type: String },
  extraInfo: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  photos: [{ type: String }],
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isApproved: { type: Boolean, default: true }, 
}, { timestamps: true });
const Person = mongoose.models.Person || mongoose.model<IPerson>('Person', PersonSchema);
export default Person;