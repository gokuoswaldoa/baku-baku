import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ConceptSection } from './components/ConceptSection';
import { CartOrder } from './components/CartOrder';
import { HowToOrderSection } from './components/HowToOrderSection';

export function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <Navbar />
      <main id="contenido" tabIndex={-1}>
        <Hero />
        <div className="paper">
          <ConceptSection />
          <CartOrder />
        </div>
      </main>
      <HowToOrderSection />
    </>
  );
}

export default App;
