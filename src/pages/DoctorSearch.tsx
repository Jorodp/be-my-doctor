import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DoctorSearch() {
  const [filters, setFilters] = useState({
    name: "",
    specialty: "",
    location: "",
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("public_search_doctors", {
      p_name: filters.name || null,
      p_specialty: filters.specialty || null,
      p_location: filters.location || null,
      p_limit: 50,
    });

    if (error) {
      console.error("Error al buscar doctores:", error);
    } else {
      setDoctors(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-6 text-[#00a0df]">
        Buscar Doctores
      </h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          placeholder="Nombre"
          className="border p-2 rounded w-full sm:w-auto"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <input
          placeholder="Especialidad"
          className="border p-2 rounded w-full sm:w-auto"
          value={filters.specialty}
          onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
        />
        <input
          placeholder="Ubicación"
          className="border p-2 rounded w-full sm:w-auto"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        />
        <button
          onClick={fetchDoctors}
          className="bg-[#00a0df] text-white px-4 py-2 rounded"
        >
          Buscar
        </button>
      </div>

      {loading && <p className="text-center">Cargando doctores...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doc) => (
          <div
            key={doc.doctor_id}
            className="border rounded-lg p-4 shadow-sm bg-white"
          >
            <img
              src={doc.profile_image_url || "https://via.placeholder.com/80"}
              alt="Foto de perfil"
              className="w-20 h-20 rounded-full mb-2"
            />
            <h2 className="font-bold text-lg">{doc.full_name}</h2>
            <p className="text-sm text-gray-700">{doc.specialty}</p>
            <p className="text-sm text-gray-500">
              {doc.practice_locations?.join(", ")}
            </p>
            <p className="text-sm">⭐ {doc.rating_avg || "Sin calificación"}</p>
            <p className="text-sm">
              {doc.consultation_fee
                ? `$${doc.consultation_fee}`
                : "Sin costo definido"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
