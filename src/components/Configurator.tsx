import { useState, type FormEvent } from 'react';
import { ShoppingBag } from 'lucide-react';
import { dips, finishes, product, toppings } from '../order-config';

import type { CartItem, Personalization } from '../cart';

interface ConfiguratorProps {
  editing: CartItem | null;
  onSave: (selection: Personalization) => void;
  onCancel: () => void;
}

export function Configurator({ editing, onSave, onCancel }: ConfiguratorProps) {
  const [finish, setFinish] = useState<(typeof finishes)[number]>(editing?.finish ?? finishes[0]);
  const [selected, setSelected] = useState<readonly (typeof toppings)[number][]>(editing?.toppings ?? [toppings[0], toppings[1]]);
  const [dip, setDip] = useState<(typeof dips)[number] | ''>(editing?.dip ?? '');
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dip) onSave({ finish, toppings: [...selected], dip });
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
      <form className="order-panel" onSubmit={save}>
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
          <button className="action" type="submit">
            <ShoppingBag aria-hidden="true" /> {editing ? "Guardar cambios" : "Agregar al carrito"}
          </button>
          {editing && <button type="button" className="cart-text-button" onClick={onCancel}>Cancelar edición</button>}
        </div>
        <p className="order-summary" aria-live="polite">
          <strong>1 × {product.name}</strong> · {finish} · {selected.join(', ') || 'Sin toppings'} · Dip: {dip || 'Por seleccionar'}
        </p>
      </form>
    </section>
  );
}
