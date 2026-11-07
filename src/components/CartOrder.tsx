import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Configurator } from './Configurator';
import { cartStorageKey, cartTotals, maxLines, maxQuantity, restoreCart, samePersonalization, validPersonalization, validQuantity, type Personalization } from '../cart';
import { availability, cartConsultationUrl, deliveryReference, modalities, product } from '../order-config';

export function CartOrder() {
  const [cart, setCart] = useState(() => {
    try { return restoreCart(localStorage.getItem(cartStorageKey)); }
    catch { return { items: [], needsReview: true }; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modality, setModality] = useState<keyof typeof modalities>('recogida');
  const [neighborhood, setNeighborhood] = useState('');
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const lastAdd = useRef(-Infinity);
  const editing = cart.items.find(item => item.id === editingId) ?? null;
  const totals = cartTotals(cart.items);

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

  function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.items.length || cart.needsReview || editing || (modality === 'entrega' && !neighborhood.trim())) return;
    if (cart.items.some(item => !validPersonalization(item) || !validQuantity(item.quantity))) {
      setCart(current => ({ ...current, needsReview: true }));
      return;
    }
    window.open(cartConsultationUrl(cart.items, modality, neighborhood), '_blank', 'noopener,noreferrer');
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
        <form className="cart-checkout" onSubmit={consult}>
          <div className="cart-subtotal" aria-live="polite">
            <p>{totals.quantity} bolas en total</p>
            <strong>Subtotal provisional: ${totals.subtotal} MXN</strong>
            <p className="order-note">Productos únicamente. Envío por confirmar.</p>
          </div>
          <div>
            <label className="modality">Modalidad del pedido
              <select value={modality} onChange={event => setModality(event.target.value === 'entrega' ? 'entrega' : 'recogida')}>
                <option value="recogida">{modalities.recogida}</option>
                <option value="entrega">{modalities.entrega}</option>
              </select>
            </label>
            {modality === 'entrega' ? (
              <>
                <label className="modality">Colonia (obligatoria)
                  <input name="colonia" type="text" required maxLength={120} pattern={'.*\\S.*'} value={neighborhood} onChange={event => setNeighborhood(event.target.value)} />
                </label>
                <p className="order-note">{deliveryReference} {availability.delivery}</p>
              </>
            ) : <p className="order-note">{availability.pickup}</p>}
          </div>
          <div>
            <button className="action" type="submit" disabled={!cart.items.length || cart.needsReview || Boolean(editing)}><MessageCircle aria-hidden="true" /> Consultar pedido por WhatsApp</button>
            <p className="order-note">{editing ? 'Guarda o cancela la edición antes de enviar.' : availability.orderNote}</p>
          </div>
        </form>
      </section>
    </>
  );
}
