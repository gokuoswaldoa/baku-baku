import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { business } from '../order-config';

const sections = [
  { id: 'hero', label: 'Bola de Fuego' },
  { id: 'configurador', label: 'Personaliza' },
  { id: 'como-pedir', label: 'Cómo pedir' },
] as const;

export function Navbar() {
  const [active, setActive] = useState<(typeof sections)[number]['id']>('hero');

  useEffect(() => {
    const configurator = document.getElementById('configurador');
    const footer = document.getElementById('como-pedir');
    if (!configurator || !footer) return;

    const updateActive = () => {
      const readingLine = window.innerHeight / 2;
      const footerBounds = footer.getBoundingClientRect();
      if (footerBounds.top <= readingLine || footerBounds.bottom <= window.innerHeight + 2) {
        setActive('como-pedir');
      } else {
        setActive(configurator.getBoundingClientRect().top <= readingLine ? 'configurador' : 'hero');
      }
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, []);

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
          {sections.map(({ id, label }) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{label}</a>
          ))}
        </nav>
        <span className="location"><MapPin size={18} aria-hidden="true" /> {business.location}</span>
        <span className="beta brush">Lanzamiento beta</span>
      </div>
    </header>
  );
}
