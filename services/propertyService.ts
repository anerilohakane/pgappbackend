import { connectDB } from '@/lib/db';
import { PGProperty } from '@/models/PGProperty';
import { Room } from '@/models/Room';
import { Bed } from '@/models/Bed';
import { ResidentProfile } from '@/models/ResidentProfile';

export async function getAllProperties(filters: { isActive?: boolean } = {}) {
  await connectDB();
  const query: any = {};
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }
  return PGProperty.find(query).sort({ createdAt: -1 });
}

export async function getPropertyById(id: string) {
  await connectDB();
  const property = await PGProperty.findById(id);
  if (!property) throw new Error('PG Property not found');
  
  // Also get stats
  const totalRooms = await Room.countDocuments({ propertyId: id });
  const totalBeds = await Bed.countDocuments({ propertyId: id });
  const occupiedBeds = await Bed.countDocuments({ propertyId: id, isOccupied: true });
  const activeResidents = await ResidentProfile.countDocuments({ propertyId: id, status: 'Active' });

  return {
    property,
    stats: {
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds: totalBeds - occupiedBeds,
      activeResidents,
    },
  };
}

export async function createProperty(data: any) {
  await connectDB();
  return PGProperty.create(data);
}

export async function updateProperty(id: string, data: any) {
  await connectDB();
  const updated = await PGProperty.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error('PG Property not found');
  return updated;
}

export async function deleteProperty(id: string) {
  await connectDB();
  // Deactivate instead of hard delete to preserve history
  const property = await PGProperty.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!property) throw new Error('PG Property not found');
  return property;
}

