import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const BackToHomeButton = () => {
  return (
    <Button variant="ghost" asChild className="mb-4">
      <Link to="/">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al inicio
      </Link>
    </Button>
  );
};