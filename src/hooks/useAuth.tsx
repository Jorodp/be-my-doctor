import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'patient' | 'doctor' | 'assistant' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  professional_license: string;
  years_experience: number | null;
  consultation_fee: number | null;
  biography: string | null;
  profile_image_url: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  profile: Profile | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, role?: UserRole, additionalData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
        
        // If user is a doctor, fetch doctor profile
        if (profileData.role === 'doctor') {
          const { data: doctorData } = await supabase
            .from('doctor_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          setDoctorProfile(doctorData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setUserRole(session?.user?.user_metadata?.role ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential recursive calls
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setDoctorProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session only once on mount
    let hasCheckedSession = false;
    if (!hasCheckedSession) {
      hasCheckedSession = true;
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Initial session check:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setUserRole(session?.user?.user_metadata?.role ?? null);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        }
        
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array to run only once

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
    try {
      console.log('Attempting to sign out...');
      
      // Clear state immediately
      setUser(null);
      setSession(null);
      setUserRole(null);
      setProfile(null);
      setDoctorProfile(null);
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      console.log('SignOut completed:', { error });
      
      return { error };
    } catch (error) {
      console.error('SignOut failed:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    userRole,
    profile,
    doctorProfile,
    loading,
    signUp,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};