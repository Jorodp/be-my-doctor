import { Button } from "@/components/ui/button";
import { Search, MapPin, Star } from "lucide-react";
import heroImage from "@/assets/hero-medical.jpg";

const Hero = () => {
  return (
    <section id="inicio" className="bg-gradient-section py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Encuentra médicos de{" "}
                <span className="text-primary">confianza</span> con Be My Doctor
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Agenda consultas presenciales con especialistas verificados. 
                Revisa perfiles, calificaciones y disponibilidad en tiempo real.
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>+1,500 médicos verificados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>+50,000 consultas realizadas</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>4.8/5 calificación promedio</span>
              </div>
            </div>

            {/* CTA Section */}
            <div className="space-y-4">
              <Button variant="hero" size="lg" className="animate-scale-in">
                <Search className="w-5 h-5" />
                Buscar médico ahora
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Disponible en toda la República Mexicana</span>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative animate-scale-in">
            <div className="relative overflow-hidden rounded-2xl shadow-medium">
              <img
                src={heroImage}
                alt="Médicos profesionales usando tecnología moderna"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-background rounded-lg shadow-soft p-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">En línea</span>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-background rounded-lg shadow-soft p-4 animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs text-muted-foreground">Disponibilidad</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;