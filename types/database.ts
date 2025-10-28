export type UserRole = 'customer' | 'driver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Driver extends User {
  vehicleModel: string;
  registrationNumber: string;
  licenseUrl: string;
  status: 'available' | 'busy' | 'offline';
}

export interface Customer extends User {
  savedAddresses: Address[];
}

export interface Address {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Ride {
  id: string;
  customerId: string;
  driverId?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  fare: number;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
}
