import dbConnect from '@/lib/mongoose';
import Person from '@/models/Person';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await dbConnect();
    const [total, killed, missing, captured] = await Promise.all([
      Person.countDocuments({ isApproved: true }),
      Person.countDocuments({ status: 'KILLED', isApproved: true }),
      Person.countDocuments({ status: 'MISSING', isApproved: true }),
      Person.countDocuments({ status: 'CAPTURED', isApproved: true }),
    ]);
    return Response.json({
      total,
      killed,
      missing,
      captured,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}