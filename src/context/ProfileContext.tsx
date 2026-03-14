import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '../models/userProfile';
import { getUserProfile, upsertUserProfile } from '../services/userProfile';
import { useAuth } from './AuthContext';

type ProfileContextValue = {
  profile: UserProfile | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (data: Partial<UserProfile>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const saveProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not signed in');
    await upsertUserProfile({ ...data, uid: user.uid, email: user.email ?? '' });
    await loadProfile();
  };

  const value: ProfileContextValue = {
    profile,
    loadingProfile,
    refreshProfile: loadProfile,
    saveProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
};
