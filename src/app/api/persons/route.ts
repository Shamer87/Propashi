import { type NextRequest } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Person from '@/models/Person';
import { getSession } from '@/lib/auth';
import { RateLimiter } from '@/lib/rateLimit';
import { sendNotificationToAdmin } from '@/lib/bot';
import { autoGeocode } from '@/lib/geocode';
const getLimiter = new RateLimiter(60, 60000);
const postLimiter = new RateLimiter(10, 60000);
function obfuscateName(fullName: string) {
  if (!fullName) return '';
  const parts = fullName.split(' ').filter(p => p.trim() !== '');
  if (parts.length === 0) return '';
  const lastName = parts[0];
  const initials = parts.slice(1).map(part => part[0].toUpperCase() + '.').join(' ');
  return initials ? `${lastName} ${initials}` : lastName;
}
function esc(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (getLimiter.isRateLimited(ip)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }
    await dbConnect();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const unit = searchParams.get('unit') || '';
    const location = searchParams.get('location') || '';
    const isApprovedParam = searchParams.get('isApproved');
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const dobStart = searchParams.get('dobStart');
    const dobEnd = searchParams.get('dobEnd');
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const session = await getSession();
    const isGuest = !session;
    console.log('[SEARCH DEBUG] isGuest:', isGuest, 'role:', session?.role, 'userId:', session?.userId);
    const filter: Record<string, unknown> = {};
    if (isGuest) {
      filter.isApproved = true;
    } else if (session.role === 'USER') {
      filter.isApproved = true;
    } else if (isApprovedParam !== null) {
      filter.isApproved = isApprovedParam === 'true';
    }
    console.log('[SEARCH DEBUG] filter:', JSON.stringify(filter));
    if (query) {
      const q = esc(query);
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { callsign: { $regex: q, $options: 'i' } }
      ];
    }
    if (status) {
      filter.status = status.toUpperCase();
    }
    if (unit) {
      filter.unit = { $regex: esc(unit), $options: 'i' };
    }
    if (location) {
      filter.locationOfEvent = { $regex: esc(location), $options: 'i' };
    }
    if (dobStart || dobEnd) {
      filter.dobParsed = {};
      if (dobStart) (filter.dobParsed as any).$gte = new Date(dobStart);
      if (dobEnd) (filter.dobParsed as any).$lte = new Date(dobEnd + 'T23:59:59.999Z');
    }
    if (dateStart || dateEnd) {
      filter.dateOfEventParsed = {};
      if (dateStart) (filter.dateOfEventParsed as any).$gte = new Date(dateStart);
      if (dateEnd) (filter.dateOfEventParsed as any).$lte = new Date(dateEnd + 'T23:59:59.999Z');
    }
    if (searchParams.get('hasCoordinates') === 'true') {
      filter.coordinates = { $ne: null, $exists: true };
      filter['coordinates.lat'] = { $exists: true };
    }
    const skip = (page - 1) * limit;
    const [persons, total] = await Promise.all([
      Person.find(filter)
        .select('externalId status fullName dob callsign unit dateOfEvent locationOfEvent direction extraInfo isApproved createdAt coordinates')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Person.countDocuments(filter),
    ]);
    const data = persons.map(p => {
      const record: any = {
        ...p,
        fullName: isGuest ? obfuscateName(p.fullName) : p.fullName
      };
      if (record.coordinates?.lat && record.coordinates?.lng) {
        const idOffset = parseInt(p._id.toString().slice(-4), 16) / 65535;
        const jitter = (idOffset - 0.5) * 0.02; 
        record.coordinates = {
          lat: Math.round(record.coordinates.lat / 0.05) * 0.05 + jitter,
          lng: Math.round(record.coordinates.lng / 0.05) * 0.05 + jitter
        };
      }
      return record;
    });
    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      isGuest
    });
  } catch (error) {
    console.error('GET /api/persons error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (postLimiter.isRateLimited(ip)) {
      return Response.json({ error: 'Забагато запитів, спробуйте пізніше' }, { status: 429 });
    }
    await dbConnect();
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Тільки авторизовані користувачі можуть створювати анкети' }, { status: 401 });
    }
    const body = await request.json();
    const { fullName, status, dob, callsign, unit, dateOfEvent, locationOfEvent, placeOfResidence, specialFeatures, extraInfo, photos, coordinates } = body;
    if (!fullName) {
      return Response.json({ error: 'fullName is required' }, { status: 400 });
    }
    let finalCoordinates = coordinates || null;
    if (!finalCoordinates && (locationOfEvent || extraInfo)) {
      const autoCoords = await autoGeocode(locationOfEvent, extraInfo);
      if (autoCoords) {
        finalCoordinates = autoCoords;
      }
    }
    const person = await Person.create({
      fullName,
      status: status || 'UNKNOWN',
      dob,
      callsign,
      unit,
      dateOfEvent,
      locationOfEvent,
      placeOfResidence,
      specialFeatures,
      extraInfo,
      photos: photos || [],
      coordinates: finalCoordinates,
      isApproved: false,
      submittedBy: session?.userId,
    });
    await sendNotificationToAdmin(`Нова анкета створена на сайті!\nПІБ: ${fullName}\nСтатус: ${person.status}\nОчікує модерації.`);
    return Response.json({ data: person }, { status: 201 });
  } catch (error) {
    console.error('POST /api/persons error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}