import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-2xl font-bold text-primary">MediConnect</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-foreground hover:text-primary transition-smooth">
              Inicio
            </a>
            <a href="#como-funciona" className="text-foreground hover:text-primary transition-smooth">
              Cómo funciona
            </a>
            <a href="#medicos" className="text-foreground hover:text-primary transition-smooth">
              Para médicos
            </a>
            <a href="#contacto" className="text-foreground hover:text-primary transition-smooth">
              Contacto
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {user && profile ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Hola, {profile.first_name || 'Usuario'}
                </span>
                <Link to="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={() => signOut()}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline">Iniciar Sesión</Button>
                </Link>
                <Link to="/auth">
                  <Button>Registrarse</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 space-y-4 animate-fade-in">
            <a href="#inicio" className="block text-foreground hover:text-primary transition-smooth">
              Inicio
            </a>
            <a href="#como-funciona" className="block text-foreground hover:text-primary transition-smooth">
              Cómo funciona
            </a>
            <a href="#medicos" className="block text-foreground hover:text-primary transition-smooth">
              Para médicos
            </a>
            <a href="#contacto" className="block text-foreground hover:text-primary transition-smooth">
              Contacto
            </a>
            <div className="pt-4 space-y-2">
              {user && profile ? (
                <>
                  <div className="text-sm text-muted-foreground px-3 py-2">
                    Hola, {profile.first_name || 'Usuario'}
                  </div>
                  <Link to="/dashboard">
                    <Button variant="outline" className="w-full">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" className="w-full" onClick={() => signOut()}>
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="w-full">Registrarse</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;