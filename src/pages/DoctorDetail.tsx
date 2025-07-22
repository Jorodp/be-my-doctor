import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Star, Clock, MapPin, Calendar } from "lucide-react";

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  rating_avg: number;
  profile_image_url: string | null;
}

// Datos de demostración
const mockDoctors: Doctor[] = [
  {
    id: "1",
    full_name: "Dr. María González",
    specialty: "Cardiología",
    rating_avg: 4.8,
    profile_image_url: null,
  },
  {
    id: "2", 
    full_name: "Dr. Carlos Rodríguez",
    specialty: "Pediatría",
    rating_avg: 4.5,
    profile_image_url: null,
  },
  {
    id: "3",
    full_name: "Dra. Ana Martínez",
    specialty: "Dermatología", 
    rating_avg: 4.9,
    profile_image_url: null,
  },
  {
    id: "4",
    full_name: "Dr. Luis Fernández",
    specialty: "Medicina Interna",
    rating_avg: 4.3,
    profile_image_url: null,
  },
  {
    id: "5",
    full_name: "Dra. Carmen López",
    specialty: "Ginecología",
    rating_avg: 4.7,
    profile_image_url: null,
  },
  {
    id: "6",
    full_name: "Dr. José García",
    specialty: "Ortopedia",
    rating_avg: 4.6,
    profile_image_url: null,
  }
];

const DoctorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    setLoading(true);
    // Simular tiempo de carga
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const foundDoctor = mockDoctors.find(doc => doc.id === id);
      setDoctor(foundDoctor || null);
    } catch (error) {
      console.error('Error fetching doctor:', error);
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-5 w-5 fill-current text-yellow-400/50" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-5 w-5 text-muted-foreground" />
      );
    }
    return stars;
  };

  const handleBackClick = () => {
    navigate('/search');
  };

  const handleBookAppointment = () => {
    // TODO: Implement appointment booking logic
    console.log('Booking appointment with:', doctor?.full_name);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Doctor no encontrado</h2>
          <Button onClick={handleBackClick} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a búsqueda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-background to-muted/20"
    >
      {/* Header with back button */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10"
      >
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={handleBackClick}
            className="hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 bg-background/60 backdrop-blur-sm border-2 border-[#00a0df]/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <img
                    src={doctor.profile_image_url || '/placeholder-doctor.png'}
                    alt={doctor.full_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#00a0df]/30 shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background shadow-md"></div>
                </motion.div>

                <div className="flex-1 text-center md:text-left">
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold text-foreground mb-2"
                  >
                    {doctor.full_name}
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl text-[#00a0df] font-semibold mb-4"
                  >
                    {doctor.specialty}
                  </motion.p>

                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center md:justify-start gap-3 mb-6"
                  >
                    <div className="flex">
                      {renderStars(doctor.rating_avg)}
                    </div>
                    <span className="text-lg font-semibold text-foreground">
                      {doctor.rating_avg.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      (Calificación promedio)
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button 
                      onClick={handleBookAppointment}
                      className="bg-[#00a0df] hover:bg-[#00a0df]/90 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Agendar Cita
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Secondary Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Biography */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full bg-background/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <div className="w-2 h-6 bg-[#00a0df] rounded-full mr-3"></div>
                  Biografía
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {doctor.full_name} es un especialista en {doctor.specialty} con amplia experiencia 
                  en el tratamiento de pacientes. Graduado de una prestigiosa universidad médica, 
                  se dedica a brindar atención médica de calidad con un enfoque personalizado 
                  para cada paciente.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Availability & Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full bg-background/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <div className="w-2 h-6 bg-[#00a0df] rounded-full mr-3"></div>
                  Información
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#00a0df]" />
                    <div>
                      <p className="font-medium text-foreground">Horarios disponibles</p>
                      <p className="text-sm text-muted-foreground">Lun - Vie: 9:00 AM - 6:00 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#00a0df]" />
                    <div>
                      <p className="font-medium text-foreground">Consultorio</p>
                      <p className="text-sm text-muted-foreground">Disponible para consultas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-[#00a0df]" />
                    <div>
                      <p className="font-medium text-foreground">Verificado</p>
                      <p className="text-sm text-muted-foreground">Doctor certificado y verificado</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DoctorDetail;