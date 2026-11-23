import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { ResidentProfile } from '@/models/ResidentProfile';
import { hashPassword, comparePassword, signToken, TokenPayload } from '@/lib/auth';

export async function authenticateUser({ email, password }: { email: string; password: string }) {
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    throw new Error('Invalid email or inactive account.');
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid password.');
  }

  let residentId: string | undefined;
  let propertyId = user.propertyId?.toString();

  if (user.role === 'resident') {
    const profile = await ResidentProfile.findOne({ userId: user._id });
    if (profile) {
      residentId = profile._id.toString();
      propertyId = profile.propertyId?.toString();
    }
  }

  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
    residentId,
    propertyId,
  };

  const token = signToken(payload);
  return { token, user: payload };
}

export async function getUserProfile(userId: string) {
  await connectDB();
  const user = await User.findById(userId).select('-password');
  if (!user) throw new Error('User not found.');

  let profileData: any = null;
  if (user.role === 'resident') {
    const rawProfile = await ResidentProfile.findOne({ userId: user._id })
      .populate('propertyId', 'name address city')
      .populate('roomId', 'roomNumber floor sharingType rentPerBed defaultRent roomType')
      .populate('bedId', 'bedNumber');

    if (rawProfile) {
      const { ResidentDocument } = await import('@/models/ResidentDocument');
      const docs = await ResidentDocument.find({ residentId: rawProfile._id }).sort({ createdAt: -1 });
      profileData = {
        ...rawProfile.toObject(),
        documents: docs,
      };
    }
  }

  return { user, residentProfile: profileData };
}

