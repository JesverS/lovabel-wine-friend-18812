import { Wine, Instagram, Facebook, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-slate text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Wine className="h-8 w-8 text-secondary" />
              <span className="font-serif text-2xl font-bold">Wine Note</span>
            </Link>
            <p className="text-sm text-primary-foreground/70">
              La plateforme qui réinvente la découverte du vin avec des cours personnalisés, des jeux chalereux et la
              passion de la communauté.
            </p>
            <div className="flex gap-3">
              <a href="#" className="hover:text-secondary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h3 className="font-semibold mb-4">Découvrir</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/learning" className="hover:text-secondary transition-colors">
                  Cours
                </Link>
              </li>
              <li>
                <Link to="/game" className="hover:text-secondary transition-colors">
                  Games
                </Link>
              </li>
              <li>
                <Link to="/cellars" className="hover:text-secondary transition-colors">
                  Cavistes partenaires
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-secondary transition-colors">
                  Evenements
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold mb-4">Communauté</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/feed" className="hover:text-secondary transition-colors">
                  Fil d'actualité
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-secondary transition-colors">
                  Évènements
                </Link>
              </li>
              <li>
                <Link to="/guides" className="hover:text-secondary transition-colors">
                  Guides & conseils
                </Link>
              </li>
              <li>
                <Link to="/members" className="hover:text-secondary transition-colors">
                  Membres
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold mb-4">À propos</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/about" className="hover:text-secondary transition-colors">
                  Notre histoire
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-secondary transition-colors">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-secondary transition-colors">
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/60">
          <p>
            © 2025 Wine Note. Tous droits réservés. L'abus d'alcool est dangereux pour la santé, à consommer avec
            modération.
          </p>
        </div>
      </div>
    </footer>
  );
};
