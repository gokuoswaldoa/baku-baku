import { useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { availability, consultationUrl, deliveryReference, dips, finishes, modalities, product, toppings } from '../order-config';

export function Configurator() {
  const [finish, setFinish] = useState<(typeof finishes)[number]>(finishes[0]);
  const [selected, setSelected] = useState<readonly (typeof toppings)[number][]>([toppings[0], toppings[1]]);
  const [dip, setDip] = useState<(typeof dips)[number] | ''>('');
  const [modality, setModality] = useState<'recogida' | 'entrega'>('recogida');

  const [neighborhood, setNeighborhood] = useState('');
  const neighborhoodName = neighborhood.trim();

  function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dip || (modality === 'entrega' && !neighborhoodName)) return;
    window.open(consultationUrl(finish, selected, dip, modality, neighborhoodName), '_blank', 'noopener,noreferrer');
  }

  function toggleTopping(topping: (typeof toppings)[number]) {
    setSelected(current => {
      if (current.includes(topping)) return current.filter(item => item !== topping);
      return current.length < 2 ? [...current, topping] : current;
    });
  }

  return (
    <section id="configurador" className="order" tabIndex={-1} aria-labelledby="order-title">
      <h2 id="order-title" className="order-title brush">Personaliza<br /> tu Bola<br /> de Fuego</h2>
      <form className="order-panel" onSubmit={consult}>
        <fieldset>
          <legend><b>1</b> Acabado</legend>
          {finishes.map(option => (
            <label className="choice" key={option}>
              <input type="radio" name="acabado" checked={finish === option} onChange={() => setFinish(option)} />
              {option}
            </label>
          ))}
        </fieldset>
        <fieldset aria-describedby="topping-limit">
          <legend><b>2</b> Toppings</legend>
          <p id="topping-limit" className="order-note">Máximo 2. Desmarca uno para cambiarlo.</p>
          {toppings.map(option => (
            <label className="choice topping" key={option}>
              <input type="checkbox" checked={selected.includes(option)} disabled={selected.length >= 2 && !selected.includes(option)} onChange={() => toggleTopping(option)} />
              {option}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend><b>3</b> Salsa aparte (obligatoria)</legend>
          {dips.map(option => (
            <label className="choice" key={option}>
              <input type="radio" name="salsa" required checked={dip === option} onChange={() => setDip(option)} />
              {option}
            </label>
          ))}
        </fieldset>
        <div className="order-total">
          <h3>Tu Baku</h3>
          <p className="order-price"><strong>${product.provisionalPrice}</strong> MXN <small>provisional</small></p>
          <label className="modality">
            Modalidad
            <select value={modality} onChange={event => setModality(event.target.value === 'entrega' ? 'entrega' : 'recogida')}>
              <option value="recogida">{modalities.recogida}</option>
              <option value="entrega">{modalities.entrega}</option>
            </select>
          </label>
          {modality === 'entrega' && (
            <>
              <label className="modality">
                Colonia (obligatoria)
                <input type="text" name="colonia" required pattern={'.*\\S.*'} value={neighborhood} onChange={event => setNeighborhood(event.target.value)} />
              </label>
              <p className="order-note">{deliveryReference} {availability.delivery}</p>
            </>
          )}
          <button className="action" type="submit">
            <MessageCircle aria-hidden="true" /> Consultar por WhatsApp
          </button>
          <p className="order-note">{availability.orderNote}</p>
        </div>
        <p className="order-summary" aria-live="polite">
          <strong>1 × {product.name}</strong> · {finish} · {selected.join(', ') || 'Sin toppings'} · Dip: {dip || 'Por seleccionar'} · {modalities[modality]}
          {modality === 'entrega' && (' · Colonia: ' + (neighborhoodName || 'Por indicar') + ' · ' + availability.delivery)}
        </p>
      </form>
    </section>
  );
}
