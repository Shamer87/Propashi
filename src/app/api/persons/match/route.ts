import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Person from '@/models/Person';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name') || '';
    const unit = searchParams.get('unit') || '';
    const dob = searchParams.get('dob') || '';
    if (!name || name.length < 3) {
      return Response.json({ data: [] });
    }
    const nameParts = name.trim().split(/\s+/).filter(p => p.length >= 2);
    if (nameParts.length === 0) {
      return Response.json({ data: [] });
    }
    const nameConditions = nameParts.map(part => ({
      fullName: { $regex: part, $options: 'i' }
    }));
    const filter: Record<string, unknown> = {
      isApproved: true,
      $and: nameConditions
    };
    if (unit && unit.length >= 2) {
      filter.unit = { $regex: unit, $options: 'i' };
    }
    const matches = await Person.find(filter)
      .select('fullName status dob unit dateOfEvent locationOfEvent')
      .lean();
    return Response.json({ data: matches });
  } catch (error) {
    console.error('Match error:', error);
    return Response.json({ matches: [] });
  }
}