import { Button } from "@/components/ui/button";
import { Users, Calendar, TrendingUp, Award } from "lucide-react";

const DoctorsSection = () => {
  const doctorBenefits = [
    {
      icon: Users,
      title: "Más pacientes",
      description: "Aumenta tu base de pacientes con nuestra plataforma que conecta a miles de usuarios diariamente."
    },
    {
      icon: Calendar,
      title: "Agenda automatizada",
      description: "Gestión inteligente de citas, recordatorios automáticos y cancelaciones sin complicaciones."
    },
    {
      icon: TrendingUp,
      title: "Crecimiento profesional",
      description: "Estadísticas detalladas de tu práctica y herramientas para hacer crecer tu consulta."
    },
    {
      icon: Award,
      title: "Reputación digital",
      description: "Construye tu reputación online con reseñas verificadas y un perfil profesional destacado."
    }
  ];

  return (
    <section id="medicos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
                ¿Eres médico? <br />
                <span className="text-primary">Únete a nosotros</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Forma parte de la plataforma médica líder en México. 
                Conecta con más pacientes y haz crecer tu práctica profesional.
              </p>
            </div>

            {/* Key Stats for Doctors */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="text-2xl font-bold text-primary mb-1">+40%</div>
              <div className="text-sm text-muted-foreground">Incremento promedio en consultas</div>
            </div>

            <div className="space-y-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => {
                  const element = document.getElementById('doctor-registration');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Soy médico, quiero registrarme
              </Button>
            </div>
          </div>

          {/* Right Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {doctorBenefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 border border-border animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements Section */}
        <div className="mt-16 bg-gradient-section rounded-3xl p-8 lg:p-12 animate-fade-in">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Requisitos para médicos
            </h3>
            <p className="text-muted-foreground">
              Proceso de verificación simple y seguro para garantizar la calidad de nuestros profesionales
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">1</div>
              <h4 className="font-semibold text-foreground">Cédula profesional</h4>
              <p className="text-sm text-muted-foreground">Documento oficial vigente</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">2</div>
              <h4 className="font-semibold text-foreground">Especialidad certificada</h4>
              <p className="text-sm text-muted-foreground">Certificación de especialidad</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">3</div>
              <h4 className="font-semibold text-foreground">Consultorio activo</h4>
              <p className="text-sm text-muted-foreground">Dirección y horarios verificables</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DoctorsSection;