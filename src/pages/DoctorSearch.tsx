import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Star, Search } from "lucide-react";

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

const DoctorSearch = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
  }, [searchTerm]);

  const fetchDoctors = async () => {
    setLoading(true);
    // Simular tiempo de carga
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      let filteredDoctors = mockDoctors;
      
      if (searchTerm) {
        filteredDoctors = mockDoctors.filter(doctor =>
          doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setDoctors(filteredDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
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
        <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-4 w-4 fill-current text-yellow-400/50" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />
      );
    }
    return stars;
  };

  const handleDoctorClick = (doctorId: string) => {
    navigate(`/doctors/${doctorId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Buscar Doctores</h1>
          <p className="text-muted-foreground text-lg">
            Encuentra doctores verificados y disponibles
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="sticky top-4 z-10 mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/80 backdrop-blur-sm border-2 focus:border-[#00a0df] transition-colors"
            />
          </div>
        </motion.div>

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* No results */}
        {!loading && doctors.length === 0 && searchTerm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg">No se encontraron doctores con ese nombre.</p>
          </motion.div>
        )}

        {/* Doctors Grid */}
        {!loading && doctors.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {doctors.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-[#00a0df]/30 bg-background/60 backdrop-blur-sm"
                  onClick={() => handleDoctorClick(doctor.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img
                          src={doctor.profile_image_url || '/placeholder-doctor.png'}
                          alt={doctor.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#00a0df]/20"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {doctor.full_name}
                        </CardTitle>
                        <p className="text-sm text-[#00a0df] font-medium">
                          {doctor.specialty}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {renderStars(doctor.rating_avg)}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {doctor.rating_avg.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ver perfil →
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DoctorSearch;