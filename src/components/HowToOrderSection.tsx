import { ChevronsRight, MessageCircle } from 'lucide-react';
import { availability, business, modalities, whatsapp } from '../order-config';

const steps = [
  ['Arma tu Baku', 'Elige acabado, toppings y salsa.'],
  ['Escríbenos', 'Revisa tu pedido y envíalo por WhatsApp.'],
  ['Recoge o recibe', modalities.recogida + '. Entregas en ' + business.deliveryCoverage + '. ' + availability.pickup],
];

export function HowToOrderSection() {
  return (
    <footer id="como-pedir" className="how">
      <h2>Cómo pedir<br /> en 3 pasos</h2>
      <ol>
        {steps.map(([title, description], index) => (
          <li key={title}>
            <span className="step-number brush" aria-hidden="true">{index + 1}</span>
            <div>
              <h3>{title}</h3><p>{description}</p>
            </div>
            {index < steps.length - 1 && <ChevronsRight className="step-arrow" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="how-contact">
        <div>
          <h3>Horario y contacto</h3>
          <p>{business.hours}</p>
        </div>
        <a className="contact" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={"Contactar por WhatsApp al " + business.whatsappDisplay}>
          <MessageCircle aria-hidden="true" /> {business.whatsappDisplay}
        </a>
      </div>
    </footer>
  );
}
