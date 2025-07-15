import { Star, Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "María González",
      location: "Ciudad de México",
      rating: 5,
      text: "Encontré al cardiólogo perfecto en solo 5 minutos. El proceso fue súper fácil y la consulta excelente. Definitivamente lo recomiendo.",
      type: "patient"
    },
    {
      name: "Dr. Carlos Mendoza",
      location: "Guadalajara",
      specialty: "Dermatólogo",
      rating: 5,
      text: "Be My me ha ayudado a conectar con más pacientes de manera organizada. La plataforma es intuitiva y el soporte técnico excelente.",
      type: "doctor"
    },
    {
      name: "Ana Martínez",
      location: "Monterrey",
      rating: 5,
      text: "Por fin una plataforma donde puedo confiar en los médicos. Todos están verificados y las reseñas son reales. Mi experiencia fue perfecta.",
      type: "patient"
    }
  ];

  return (
    <section className="py-20 bg-gradient-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Miles de pacientes y médicos confían en Be My para sus necesidades de salud
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105 border border-border animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Quote Icon */}
              <div className="mb-6">
                <Quote className="w-8 h-8 text-primary/30" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-muted-foreground leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Author Info */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.specialty || "Paciente"} • {testimonial.location}
                    </div>
                  </div>
                </div>
              </div>

              {/* User type badge */}
              <div className="mt-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  testimonial.type === 'doctor' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-accent/50 text-accent-foreground'
                }`}>
                  {testimonial.type === 'doctor' ? '👨‍⚕️ Médico' : '👤 Paciente'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-16 text-center animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span className="text-lg font-semibold text-foreground">4.8/5</span>
            </div>
            <div className="text-muted-foreground">
              Basado en +2,500 reseñas verificadas
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;