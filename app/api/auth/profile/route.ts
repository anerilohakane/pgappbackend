import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { User } from '@/models/User';
import { ResidentProfile } from '@/models/ResidentProfile';
import { connectDB } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const body = await req.json();
    const user = await User.findById(auth.user.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update basic user profile fields
    if (body.name) user.name = body.name.trim();
    if (body.phone) user.phone = body.phone.trim();
    if (body.password && body.password.trim()) {
      user.password = await hashPassword(body.password.trim());
    }
    await user.save();

    // If resident role, also update personal resident profile details
    if (user.role === 'resident') {
      const resProfile = await ResidentProfile.findOne({ userId: user._id });
      if (resProfile) {
        if (body.name) resProfile.fullName = body.name.trim();
        if (body.phone) resProfile.phone = body.phone.trim();
        if (body.permanentAddress !== undefined) resProfile.permanentAddress = body.permanentAddress.trim();
        if (body.occupation !== undefined) resProfile.occupation = body.occupation;
        if (body.companyOrCollege !== undefined) resProfile.companyOrCollege = body.companyOrCollege.trim();
        if (body.emergencyContactName !== undefined) resProfile.emergencyContactName = body.emergencyContactName.trim();
        if (body.emergencyContactNumber !== undefined) resProfile.emergencyContactNumber = body.emergencyContactNumber.trim();
        await resProfile.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 400 });
  }
}

