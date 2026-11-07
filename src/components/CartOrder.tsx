import { useEffect, useRef, useState } from 'react';
import { OrderCheckout } from './OrderCheckout';
import { Configurator } from './Configurator';
import { cartStorageKey, maxLines, maxQuantity, restoreCart, samePersonalization, validPersonalization, validQuantity, type Personalization } from '../cart';
import { product } from '../order-config';

export function CartOrder() {
  const [cart, setCart] = useState(() => {
    try { return restoreCart(localStorage.getItem(cartStorageKey)); }
    catch { return { items: [], needsReview: true }; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const lastAdd = useRef(-Infinity);
  const editing = cart.items.find(item => item.id === editingId) ?? null;

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify({ version: 1, ...cart }));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [cart]);

  function save(selection: Personalization) {
    if (!validPersonalization(selection)) return;
    const now = Date.now();
    if (now - lastAdd.current < 600) return;
    lastAdd.current = now;
    const existing = cart.items.find(item => samePersonalization(item, selection));
    if (!editing && (existing ? existing.quantity >= maxQuantity : cart.items.length >= maxLines)) {
      setNotice('Alcanzaste el límite de este carrito. Ajusta sus cantidades antes de continuar.');
      return;
    }
    const id = crypto.randomUUID();
    setCart(current => {
      if (editing) return { ...current, items: current.items.map(item => item.id === editing.id ? { ...item, ...selection } : item) };
      const match = current.items.find(item => samePersonalization(item, selection));
      if (match) return { ...current, items: current.items.map(item => item.id === match.id && item.quantity < maxQuantity ? { ...item, quantity: item.quantity + 1 } : item) };
      if (current.items.length >= maxLines) return current;
      return { ...current, items: [...current.items, { ...selection, id, quantity: 1 }] };
    });
    setEditingId(null);
    setNotice(editing ? 'Personalización actualizada.' : 'Bola agregada al carrito.');
  }

  function changeQuantity(id: string, quantity: number) {
    if (!validQuantity(quantity)) return;
    setCart(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, quantity } : item) }));
  }

  function remove(id: string) {
    setCart(current => ({ ...current, items: current.items.filter(item => item.id !== id) }));
    if (editingId === id) setEditingId(null);
    setNotice('Personalización eliminada.');
  }

  function validateItems() {
    if (cart.items.every(item => validPersonalization(item) && validQuantity(item.quantity))) return true;
    setCart(current => ({ ...current, needsReview: true }));
    return false;
  }

  return (
    <>
      <Configurator key={editing?.id ?? 'new'} editing={editing} onSave={save} onCancel={() => setEditingId(null)} />
      <section className="cart-section" id="carrito" aria-labelledby="cart-title">
        <h2 id="cart-title">Tu carrito</h2>
        <p role="status">{notice}</p>
        {storageError && <p role="alert">El navegador no pudo guardar el carrito. Conserva esta página abierta hasta enviar tu consulta.</p>}
        {cart.needsReview && (
          <div className="cart-warning" role="alert">
            <p>Descartamos datos u opciones guardadas que ya no son válidos. Revisa las bolas restantes y vuelve a agregar las que falten antes de enviar.</p>
            <button className="cart-text-button" type="button" onClick={() => setCart(current => ({ ...current, needsReview: false }))}>Ya revisé y corregí mi carrito</button>
          </div>
        )}
        {!cart.items.length && <p>Elige una personalización y agrega tu primera Bola de Fuego XL.</p>}
        <ul className="cart-items">
          {cart.items.map((item, index) => (
            <li className="cart-item" key={item.id}>
              <div>
                <h3>{index + 1}. {product.name}</h3>
                <p>{item.finish} · {item.toppings.join(', ') || 'Sin toppings'} · Dip: {item.dip}</p>
                <p>${product.provisionalPrice} MXN por unidad · ${item.quantity * product.provisionalPrice} MXN provisional</p>
              </div>
              <div className="cart-controls">
                <button type="button" aria-label={'Reducir cantidad de bola ' + (index + 1)} disabled={item.quantity <= 1} onClick={() => changeQuantity(item.id, item.quantity - 1)}>−</button>
                <label>Cantidad
                  <select aria-label={'Cantidad de bola ' + (index + 1)} value={item.quantity} onChange={event => changeQuantity(item.id, Number(event.target.value))}>
                    {Array.from({ length: maxQuantity }, (_, quantity) => <option key={quantity + 1} value={quantity + 1}>{quantity + 1}</option>)}
                  </select>
                </label>
                <button type="button" aria-label={'Aumentar cantidad de bola ' + (index + 1)} disabled={item.quantity >= maxQuantity} onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                <button className="cart-text-button" type="button" aria-label={'Editar bola ' + (index + 1)} onClick={() => {
                  setEditingId(item.id);
                  document.getElementById('configurador')?.scrollIntoView({ behavior: 'smooth' });
                  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name=acabado]:checked')?.focus({ preventScroll: true }));
                }}>Editar</button>
                <button className="cart-text-button" type="button" aria-label={'Eliminar bola ' + (index + 1)} onClick={() => remove(item.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
        <OrderCheckout items={cart.items} blocked={cart.needsReview} editing={Boolean(editing)} validateItems={validateItems} />
      </section>
    </>
  );
}
