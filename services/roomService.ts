import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { Bed } from '@/models/Bed';
import { ResidentProfile } from '@/models/ResidentProfile';

export async function getRooms(propertyId?: string) {
  await connectDB();
  const query = propertyId ? { propertyId } : {};
  const rooms = await Room.find(query).populate('propertyId', 'name').sort({ floor: 1, roomNumber: 1 });

  // Get active residents occupying each room
  const activeResidents = await ResidentProfile.find({
    status: { $in: ['Active', 'Notice Period'] },
  }).select('fullName phone monthlyRent occupancyType roomId');

  const occupantsByRoom: Record<string, any[]> = {};
  for (const res of activeResidents) {
    if (!res.roomId) continue;
    const rId = res.roomId.toString();
    if (!occupantsByRoom[rId]) occupantsByRoom[rId] = [];
    occupantsByRoom[rId].push(res);
  }

  return rooms.map((r) => {
    const occupants = occupantsByRoom[r._id.toString()] || [];
    const isFull =
      r.rentalType === 'Full Room (Single Tenant)'
        ? occupants.length >= 1
        : occupants.length >= r.maxCapacity;

    return {
      ...r.toObject(),
      occupants,
      currentOccupants: occupants.length,
      availableSlots: r.rentalType === 'Full Room (Single Tenant)' ? (occupants.length === 0 ? 1 : 0) : Math.max(0, r.maxCapacity - occupants.length),
      isFull,
    };
  });
}

export async function createRoom(data: {
  propertyId: string;
  roomNumber: string;
  floor: number;
  roomType: 'AC' | 'Non-AC';
  rentalType: 'Full Room (Single Tenant)' | 'Sharing';
  maxCapacity: number;
  defaultRent: number;
}) {
  await connectDB();
  const existing = await Room.findOne({ propertyId: data.propertyId, roomNumber: data.roomNumber });
  if (existing) {
    throw new Error(`Room ${data.roomNumber} already exists in this PG property.`);
  }

  return Room.create(data);
}

export async function updateRoom(id: string, data: Partial<any>) {
  await connectDB();
  const updated = await Room.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error('Room not found');
  return updated;
}

export async function getBeds(propertyId?: string, roomId?: string) {
  await connectDB();
  const query: any = {};
  if (propertyId) query.propertyId = propertyId;
  if (roomId) query.roomId = roomId;
  return Bed.find(query).populate('currentResidentId', 'fullName phone email').sort({ bedNumber: 1 });
}

export async function allocateBed({ bedId, residentId }: { bedId: string; residentId: string }) {
  await connectDB();
  const bed = await Bed.findById(bedId);
  if (!bed) throw new Error('Bed not found');
  bed.currentResidentId = residentId as any;
  bed.isOccupied = true;
  bed.status = 'Occupied';
  await bed.save();
  await ResidentProfile.findByIdAndUpdate(residentId, { bedId: bed._id });
  return bed;
}

export async function vacateBed(bedId: string) {
  await connectDB();
  const bed = await Bed.findById(bedId);
  if (!bed) throw new Error('Bed not found');
  const residentId = bed.currentResidentId;
  bed.currentResidentId = undefined;
  bed.isOccupied = false;
  bed.status = 'Vacant';
  await bed.save();
  if (residentId) {
    await ResidentProfile.findByIdAndUpdate(residentId, { $unset: { bedId: 1 } });
  }
  return bed;
}

