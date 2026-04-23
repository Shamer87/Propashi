import { NextRequest } from 'next/server';
// cache bust
import dbConnect from '@/lib/mongoose';
import Person from '@/models/Person';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { sendNotificationToUser } from '@/lib/bot';
import { autoGeocode } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

// GET single record
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const person = await Person.findById(id).lean();

    if (!person) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const session = await getSession();
    const isGuest = !session;

    // Obfuscate name for guests
    if (isGuest) {
      const parts = person.fullName.split(' ').filter((p: string) => p.trim() !== '');
      if (parts.length > 0) {
        const lastName = parts[0];
        const initials = parts.slice(1).map((part: string) => part[0].toUpperCase() + '.').join(' ');
        person.fullName = initials ? `${lastName} ${initials}` : lastName;
      }
    }

    // Obfuscate coordinates for everyone
    if (person.coordinates?.lat && person.coordinates?.lng) {
      const idOffset = parseInt(person._id.toString().slice(-4), 16) / 65535;
      const jitter = (idOffset - 0.5) * 0.02;
      person.coordinates = {
        lat: Math.round(person.coordinates.lat / 0.05) * 0.05 + jitter,
        lng: Math.round(person.coordinates.lng / 0.05) * 0.05 + jitter
      };
    }

    return Response.json({ data: person, isGuest });
  } catch (error) {
    console.error('GET /api/persons/[id]:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT update record (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Не авторизовано' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const person = await Person.findById(id);
    if (!person) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.role === 'USER') {
      if (!person.submittedBy || person.submittedBy.toString() !== session.userId) {
        return Response.json({ error: 'Доступ заборонено' }, { status: 403 });
      }
    }

    // Auto-geocode logic
    let finalCoordinates = body.coordinates;
    
    // If no coordinates are passed from frontend, OR if we're trying to clear them
    // but we have a locationOfEvent, try to auto-geocode
    if (!finalCoordinates && (body.locationOfEvent || body.extraInfo)) {
      // Only re-geocode if location changed, or if person didn't have coordinates before
      const locationChanged = 
        body.locationOfEvent !== person.locationOfEvent || 
        body.extraInfo !== person.extraInfo;
        
      if (locationChanged || !person.coordinates) {
        const autoCoords = await autoGeocode(body.locationOfEvent, body.extraInfo);
        if (autoCoords) {
          finalCoordinates = autoCoords;
        } else {
          // Keep old coordinates if auto-geocode failed and we didn't explicitly delete them
          finalCoordinates = person.coordinates; 
        }
      } else {
        // Keep old coordinates
        finalCoordinates = person.coordinates;
      }
    }

    const updates: any = {
      fullName: body.fullName,
      status: body.status,
      dob: body.dob,
      callsign: body.callsign,
      unit: body.unit,
      dateOfEvent: body.dateOfEvent,
      locationOfEvent: body.locationOfEvent,
      placeOfResidence: body.placeOfResidence,
      specialFeatures: body.specialFeatures,
      extraInfo: body.extraInfo,
      photos: body.photos || [],
      coordinates: finalCoordinates,
    };

    if (session.role === 'ADMIN' || session.role === 'MODERATOR') {
      updates.isApproved = body.isApproved;
    }

    const updated = await Person.findByIdAndUpdate(id, updates, { new: true }).lean();

    if (!updated) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/persons/[id]:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - quick approve/reject (moderation)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MODERATOR')) {
      return Response.json({ error: 'Доступ заборонено' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const isApproved = !!body.isApproved;
    const oldRecord = await Person.findById(id);
    if (!oldRecord) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await Person.findByIdAndUpdate(id, { isApproved }, { new: true }).lean();

    // Send notification if approved and user has linked Telegram
    if (isApproved && !oldRecord.isApproved && updated?.submittedBy) {
      const submitter = await User.findById(updated.submittedBy);
      if (submitter && submitter.telegramChatId) {
        await sendNotificationToUser(submitter.telegramChatId, `Вашу заявку щодо "${updated.fullName}" було схвалено модератором!`);
      }
    }

    return Response.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/persons/[id]:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - remove record (admin/mod only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MODERATOR')) {
      return Response.json({ error: 'Доступ заборонено' }, { status: 403 });
    }

    const { id } = await params;
    const record = await Person.findById(id);
    if (!record) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Send rejection notification to the submitter via Telegram
    if (record.submittedBy) {
      const submitter = await User.findById(record.submittedBy);
      if (submitter && submitter.telegramChatId) {
        await sendNotificationToUser(
          submitter.telegramChatId,
          `Вашу заявку щодо "${record.fullName}" було відхилено модератором.\n\nЯкщо ви вважаєте це помилкою, зверніться до адміністрації.`
        );
      }
    }

    await Person.findByIdAndDelete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/persons/[id]:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
