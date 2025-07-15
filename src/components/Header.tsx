import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-2xl font-bold text-primary">Be My</span>
          </div>

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
          <div className="hidden md:block">
            <Button variant="default">
              Registrarse
            </Button>
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
            <Button variant="default" className="w-full">
              Registrarse
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;