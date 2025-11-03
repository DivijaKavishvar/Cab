import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role: UserRole, driverDetails?: {
    vehicleModel: string;
    registrationNumber: string;
    licenseUrl: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers = [
  {
    id: '1',
    email: 'customer@example.com',
    password: 'Customer@123',
    role: 'customer' as UserRole,
    name: 'John Customer',
    phone: '+1234567890',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'driver@example.com',
    password: 'Driver@123',
    role: 'driver' as UserRole,
    name: 'Jane Driver',
    phone: '+1234567891',
    createdAt: new Date().toISOString(),
    vehicleModel: 'Toyota Camry 2022',
    registrationNumber: 'ABC-1234',
    licenseUrl: 'https://example.com/license.jpg',
    status: 'available',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedUser = localStorage.getItem('cabby_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    const mockUser = mockUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (!mockUser) {
      throw new Error('Invalid email or password');
    }

    const { password: _, ...userWithoutPassword } = mockUser;
    setUser(userWithoutPassword);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('cabby_user', JSON.stringify(userWithoutPassword));
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    role: UserRole,
    driverDetails?: {
      vehicleModel: string;
      registrationNumber: string;
      licenseUrl: string;
    }
  ) => {
    const existingUser = mockUsers.find((u) => u.email === email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const newUser: any = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      role,
      name,
      phone,
      createdAt: new Date().toISOString(),
    };

    if (role === 'driver' && driverDetails) {
      newUser.vehicleModel = driverDetails.vehicleModel;
      newUser.registrationNumber = driverDetails.registrationNumber;
      newUser.licenseUrl = driverDetails.licenseUrl;
      newUser.status = 'available';
    }

    mockUsers.push({ ...newUser, password });
    setUser(newUser);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('cabby_user', JSON.stringify(newUser));
    }
  };

  const signOut = async () => {
    setUser(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('cabby_user');
    }
  };

  const resetPassword = async (email: string) => {
    const userExists = mockUsers.find((u) => u.email === email);
    if (!userExists) {
      throw new Error('Email not found');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('cabby_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
