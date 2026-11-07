import { CirclePlus, CookingPot, Package, Sprout } from 'lucide-react';

const features = [
  { Icon: Package, label: 'Relleno Tampico' },
  { Icon: Sprout, label: 'Panko japonés' },
  { Icon: CirclePlus, label: '4 cortes' },
  { Icon: CookingPot, label: 'Salsa en vasito' },
];

export function ConceptSection() {
  return (
    <ul className="feature-strip" aria-label="Características de la Bola de Fuego">
      {features.map(({ Icon, label }) => (
        <li key={label}><Icon aria-hidden="true" /><span>{label}</span></li>
      ))}
    </ul>
  );
}
