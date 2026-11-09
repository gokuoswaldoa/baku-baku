import { ArrowRight } from 'lucide-react';
import { product } from '../order-config';

export function Hero() {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title" className="headline">Crujiente<br /> por fuera.</h1>
        <p className="hero-kicker">Auténtico street food <strong>japonés</strong></p>
        <p className="hero-claim brush">Todo el sabor del sushi<br /> por dentro.</p>
        <div className="hero-actions">
          <p className="hero-description">Bola de arroz al panko con relleno generoso de surimi y queso crema estilo Tampico, partida en 4 piezas.</p>
          <div className="hero-order">
            <p className="price-ticket brush"><strong>${product.unitPrice}</strong> <span>MXN<br /> c/u</span></p>
            <a className="action" href="#configurador">Arma tu Baku <ArrowRight aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className="hero-photo">
        <img className="product-photo" src={product.photo} alt="Bola de Fuego XL empanizada, abierta para mostrar el relleno estilo Tampico" fetchPriority="high" />
        <img className="hero-mascot" src="/assets/mascota.png" alt="" />
      </div>
    </section>
  );
}
