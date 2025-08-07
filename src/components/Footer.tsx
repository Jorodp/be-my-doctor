import { Facebook, Instagram, Twitter, Mail, MapPin } from "lucide-react";


const Footer = () => {
  return (
    <footer id="contacto" className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/lovable-uploads/1dd302bf-f10f-47bb-b8f0-350720637593.png" alt="Be My logo" className="h-8 w-auto" loading="lazy" />
            </div>
            <p className="text-background/80 leading-relaxed">
              Conectamos pacientes con médicos verificados para consultas presenciales seguras y confiables.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-background/60 hover:text-primary transition-smooth">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/60 hover:text-primary transition-smooth">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/60 hover:text-primary transition-smooth">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-background">Enlaces rápidos</h3>
            <ul className="space-y-2">
              <li>
                <a href="#inicio" className="text-background/80 hover:text-primary transition-smooth">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="text-background/80 hover:text-primary transition-smooth">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#medicos" className="text-background/80 hover:text-primary transition-smooth">
                  Para médicos
                </a>
              </li>
              <li>
                <a href="#" className="text-background/80 hover:text-primary transition-smooth">
                  Especialidades
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-background">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://rvsoeuwlgnovcmemlmqz.supabase.co/storage/v1/object/public/legal-documents/aviso-de-privacidad.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-background/80 hover:text-primary transition-smooth"
                >
                  Aviso de privacidad
                </a>
              </li>
              <li>
                <a 
                  href="https://rvsoeuwlgnovcmemlmqz.supabase.co/storage/v1/object/public/legal-documents/terminos-y-condiciones.docx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-background/80 hover:text-primary transition-smooth"
                >
                  Términos y condiciones
                </a>
              </li>
              <li>
                <a href="#" className="text-background/80 hover:text-primary transition-smooth">
                  Política de cookies
                </a>
              </li>
              <li>
                <a href="#" className="text-background/80 hover:text-primary transition-smooth">
                  Preguntas frecuentes
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-background">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-background/80">hola@bemy.com.mx</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-background/80">Ciudad de México, México</span>
              </li>
            </ul>
            
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-background/60 text-sm">
              © 2025 Be My. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4 text-sm text-background/60">
              <span>Hecho con ❤️ en México</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Sistema operativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;