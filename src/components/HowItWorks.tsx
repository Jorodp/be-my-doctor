import { Search, UserCheck, Calendar } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: "Busca por especialidad",
      description: "Encuentra médicos por especialidad y ubicación. Filtra por disponibilidad, calificaciones y distancia.",
      step: "01"
    },
    {
      icon: UserCheck,
      title: "Revisa perfiles verificados",
      description: "Consulta la cédula profesional, experiencia, calificaciones y comentarios de otros pacientes.",
      step: "02"
    },
    {
      icon: Calendar,
      title: "Agenda tu consulta",
      description: "Selecciona fecha y hora disponible. Recibe confirmación inmediata y recordatorios automáticos.",
      step: "03"
    }
  ];

  return (
    <section id="como-funciona" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            ¿Cómo funciona?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Conectarte con el médico ideal es más fácil de lo que imaginas. 
            Solo sigue estos 3 pasos simples.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Connection line (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary to-primary/30 z-0"></div>
              )}

              <div className="relative bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 group-hover:scale-105 border border-border">
                {/* Step number */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-hero rounded-full flex items-center justify-center text-white font-bold text-sm z-10">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-4">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in">
          <p className="text-muted-foreground mb-6">
            ¿Listo para comenzar? Solo te tomará unos minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary-dark transition-smooth shadow-soft hover:shadow-medium">
              Buscar médico
            </button>
            <button className="border border-primary text-primary px-6 py-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-smooth">
              Ver demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;