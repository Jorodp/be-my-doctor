import { Shield, Clock, FileText, Phone } from "lucide-react";

const Benefits = () => {
  const benefits = [
    {
      icon: Shield,
      title: "Médicos verificados",
      description: "Todos nuestros médicos han sido verificados. Revisamos cédulas profesionales, especialidades y certificaciones."
    },
    {
      icon: Clock,
      title: "Reservas rápidas",
      description: "Agenda tu cita en menos de 2 minutos. Confirmación inmediata y recordatorios automáticos por SMS."
    },
    {
      icon: FileText,
      title: "Historial médico",
      description: "Accede a tu historial completo, recetas y estudios desde cualquier dispositivo, las 24 horas del día."
    },
    {
      icon: Phone,
      title: "Comunicación segura",
      description: "Chatea con tu médico sin compartir tu número personal. Sistema de mensajería seguro y privado."
    }
  ];

  return (
    <section className="py-20 bg-gradient-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            ¿Por qué elegir <span className="text-primary">Be My</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Ofrecemos una experiencia médica moderna, segura y conveniente 
            que pone tu salud en el centro de todo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 group-hover:scale-105 border border-border h-full">
                {/* Icon */}
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-4">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-card rounded-3xl p-8 lg:p-12 shadow-soft border border-border animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">+1,500</div>
              <div className="text-muted-foreground">Médicos activos</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">+50K</div>
              <div className="text-muted-foreground">Consultas realizadas</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">4.8★</div>
              <div className="text-muted-foreground">Calificación promedio</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Satisfacción del usuario</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;