import { MapPin } from 'lucide-react';
import { business } from '../order-config';

export function Navbar() {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <a className="brand" href="#hero" aria-label={business.name + ", inicio"}>
          <img className="brand-mascot" src="/assets/mascota.png" alt="" />
          <span className="brand-lettering">
            <img src="/assets/BAKU-BAKU_transparente.webp" alt="" />
            <img src="/assets/SUSHI-Y-FIRE_transparente.webp" alt="" />
          </span>
        </a>
        <nav aria-label="Principal">
          <a href="#hero">Bola de Fuego</a>
          <a href="#configurador">Personaliza</a>
          <a href="#como-pedir">Cómo pedir</a>
        </nav>
        <span className="location"><MapPin size={18} aria-hidden="true" /> {business.location}</span>
        <span className="beta brush">Lanzamiento beta</span>
      </div>
    </header>
  );
}
