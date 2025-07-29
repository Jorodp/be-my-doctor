import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Benefits from "@/components/Benefits";
import TopDoctors from "@/components/TopDoctors";
import DoctorsSection from "@/components/DoctorsSection";
import DoctorRegistrationForm from "@/components/DoctorRegistrationForm";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for auth errors in URL hash
    const hash = window.location.hash;
    if (hash.includes('error=access_denied') && hash.includes('otp_expired')) {
      toast({
        variant: "destructive",
        title: "Enlace expirado",
        description: "El enlace de verificación ha expirado. Por favor registrate de nuevo o contacta soporte.",
      });
      
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Redirect to auth page
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } else if (hash.includes('access_token')) {
      // Handle successful auth callback that came to wrong URL
      navigate('/auth/callback');
    }
  }, [navigate, toast]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <TopDoctors />
        <DoctorsSection />
        
        {/* Sección de registro para doctores */}
        <section className="py-16 bg-gradient-section">
          <div className="container mx-auto px-4">
            <DoctorRegistrationForm />
          </div>
        </section>
        
        {/* <Testimonials /> */}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
