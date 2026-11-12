import { useState, type FormEvent } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { dips, finishes, product, toppings } from '../order-config';

import type { CartItem, Personalization } from '../cart';

interface ConfiguratorProps {
  editing: CartItem | null;
  feedback: string;
  added: boolean;
  onSave: (selection: Personalization) => void;
  onCancel: () => void;
}

export function Configurator({ editing, feedback, added, onSave, onCancel }: ConfiguratorProps) {
  const [finish, setFinish] = useState<(typeof finishes)[number]>(editing?.finish ?? finishes[0]);
  const [selected, setSelected] = useState<readonly (typeof toppings)[number][]>(editing?.toppings ?? [toppings[0], toppings[1]]);
  const [dip, setDip] = useState<(typeof dips)[number] | ''>(editing?.dip ?? '');
  const toppingLimitReached = selected.length >= 2;
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
          <p id="topping-limit" className="topping-limit">
            <strong>{selected.length} de 2</strong>{toppingLimitReached && ' · Desmarca uno para cambiarlo'}
          </p>
          {toppings.map(option => (
            <label className="choice topping" key={option}>
              <input type="checkbox" checked={selected.includes(option)} disabled={toppingLimitReached && !selected.includes(option)} onChange={() => toggleTopping(option)} />
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
          <p className="order-price"><strong>${product.unitPrice}</strong> MXN <small>por unidad</small></p>
          <button className="action" type="submit" aria-describedby={dip ? undefined : 'dip-needed'}>
            <ShoppingBag aria-hidden="true" /> {editing ? "Guardar cambios" : "Agregar al carrito"}
          </button>
          {!dip && <p id="dip-needed" className="dip-needed">Elige un dip o marca «Sin dip» para continuar.</p>}
          <p className="order-feedback" role="status">
            {added && <Check size={18} aria-hidden="true" />}
            {feedback}
          </p>
          {added && <a className="order-cart-link" href="#cart-title">Ver carrito</a>}
          {editing && <button type="button" className="cart-text-button" onClick={onCancel}>Cancelar edición</button>}
        </div>
        <p className="order-summary" aria-live="polite">
          <strong>1 × {product.name}</strong> · {finish} · {selected.join(', ') || 'Sin toppings'} · Dip: {dip || 'Por seleccionar'}
        </p>
      </form>
    </section>
  );
}
