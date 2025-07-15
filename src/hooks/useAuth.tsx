import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type VerificationStatus = Database['public']['Enums']['verification_status'];

interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  professional_license: string;
  specialty: string;
  biography: string | null;
  profile_image_url: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, role?: UserRole, additionalData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  createDoctorProfile: (data: Omit<DoctorProfile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'verification_status' | 'verified_at' | 'verified_by'>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);

      // If user is a doctor, fetch doctor profile
      if (profileData.role === 'doctor') {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctor_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!doctorError && doctorData) {
          setDoctorProfile(doctorData);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile data when user is authenticated
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setDoctorProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, role: UserRole = 'patient', additionalData: any = {}) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role,
          ...additionalData
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setDoctorProfile(null);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No authenticated user' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  const createDoctorProfile = async (data: Omit<DoctorProfile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'verification_status' | 'verified_at' | 'verified_by'>) => {
    if (!user) return { error: 'No authenticated user' };

    const { error } = await supabase
      .from('doctor_profiles')
      .insert({
        user_id: user.id,
        ...data
      });

    if (!error) {
      // Refetch doctor profile
      setTimeout(() => {
        fetchProfile(user.id);
      }, 0);
    }

    return { error };
  };

  const value = {
    user,
    session,
    profile,
    doctorProfile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    createDoctorProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};