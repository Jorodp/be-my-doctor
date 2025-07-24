import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Benefits from "@/components/Benefits";
import TopDoctors from "@/components/TopDoctors";
import DoctorsSection from "@/components/DoctorsSection";
import DoctorRegistrationForm from "@/components/DoctorRegistrationForm";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

const Index = () => {
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
        
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
