import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { cartTotals, type CartItem } from '../cart';
import { checkoutMessage, readCheckout } from '../checkout';
import { availability, deliveryReference, modalities, whatsapp } from '../order-config';
import { DeliveryLocation } from './DeliveryLocation';

function ContactPhone({ name, label }: { name: string; label: string }) {
  return (
    <label className="modality">{label} (10 dígitos)
      <input name={name} type="tel" inputMode="numeric" required pattern="[0-9]{10}" maxLength={10} />
    </label>
  );
}

interface Props {
  items: CartItem[];
  blocked: boolean;
  editing: boolean;
  validateItems: () => boolean;
}

export function OrderCheckout({ items, blocked, editing, validateItems }: Props) {
  const [modality, setModality] = useState<keyof typeof modalities>('recogida');
  const [preview, setPreview] = useState<{ items: CartItem[]; message: string }>();
  const [feedback, setFeedback] = useState('');
  const previewTitle = useRef<HTMLHeadingElement>(null);
  const totals = cartTotals(items);
  const message = preview?.items === items && !blocked && !editing ? preview.message : undefined;

  useEffect(() => {
    if (message) previewTitle.current?.focus();
  }, [message]);

  function clearPreview() {
    setPreview(undefined);
    setFeedback('');
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearPreview();
    if (!items.length || blocked || editing || !validateItems()) return;
    const details = readCheckout(new FormData(event.currentTarget), modality);
    if (!details) {
      setFeedback('Revisa el contacto y, para entrega, la dirección y las coordenadas del pin.');
      return;
    }
    setPreview({ items, message: checkoutMessage(items, details) });
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setFeedback('Mensaje copiado. Abre el chat del negocio y pégalo.');
    } catch {
      setFeedback('No se pudo copiar. Selecciona y copia el mensaje manualmente.');
    }
  }

  return (
    <form className="cart-checkout" autoComplete="off" onChange={clearPreview} onSubmit={prepare}>
      <div className="cart-subtotal" aria-live="polite">
        <p>{totals.quantity} bolas en total</p>
        <strong>Subtotal provisional: ${totals.subtotal} MXN</strong>
        <p className="order-note">Productos únicamente. Envío por confirmar.</p>
      </div>
      <div className="checkout-details">
        <label className="modality">Modalidad del pedido
          <select value={modality} onChange={event => setModality(event.target.value === 'entrega' ? 'entrega' : 'recogida')}>
            <option value="recogida">{modalities.recogida}</option>
            <option value="entrega">{modalities.entrega}</option>
          </select>
        </label>
        <fieldset>
          <legend>Contacto del pedido</legend>
          <label className="modality">Nombre de contacto
            <input name="customerName" required maxLength={120} pattern={'.*\\S.*'} />
          </label>
          <ContactPhone name="customerPhone" label="Teléfono de contacto" />
        </fieldset>
        {modality === 'entrega' ? (
          <>
            <fieldset>
              <legend>Dirección de entrega</legend>
              <label className="modality">Nombre de quien recibe
                <input name="recipientName" required maxLength={120} pattern={'.*\\S.*'} />
              </label>
              <ContactPhone name="recipientPhone" label="Teléfono de quien recibe" />
              <label className="modality">Calle
                <input name="street" required maxLength={120} pattern={'.*\\S.*'} />
              </label>
              <div className="checkout-field-grid">
                <label className="modality">Exterior o S/N
                  <input name="exterior" required maxLength={20} pattern={'.*\\S.*'} />
                </label>
                <label className="modality">Interior (opcional)
                  <input name="interior" maxLength={20} />
                </label>
              </div>
              <label className="modality">Colonia
                <input name="colonia" required maxLength={120} pattern={'.*\\S.*'} />
              </label>
              <div className="checkout-field-grid">
                <label className="modality">Municipio
                  <input name="municipality" required maxLength={80} pattern={'.*\\S.*'} />
                </label>
                <label className="modality">C. P. (opcional)
                  <input name="postalCode" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} />
                </label>
              </div>
              <label className="modality">Referencias (opcional)
                <input name="references" maxLength={500} />
              </label>
            </fieldset>
            <DeliveryLocation onChange={clearPreview} />
            <p className="order-note">{deliveryReference} {availability.delivery}</p>
          </>
        ) : <p className="order-note">{availability.pickup}</p>}
      </div>
      <div>
        <button className="action" type="submit" disabled={!items.length || blocked || editing}>
          <MessageCircle aria-hidden="true" /> Revisar pedido para WhatsApp
        </button>
        <p className="order-note">{editing ? 'Guarda o cancela la edición antes de enviar.' : availability.orderNote}</p>
        <p className="order-note" role="status">{feedback}</p>
        {message && (
          <section className="checkout-preview" aria-labelledby="checkout-preview-title">
            <h3 id="checkout-preview-title" ref={previewTitle} tabIndex={-1}>Resumen para el negocio</h3>
            <p className="order-note">Copia el mensaje, abre el chat del negocio y pégalo para enviar tu consulta.</p>
            <textarea aria-label="Mensaje de WhatsApp del pedido" readOnly rows={9} value={message} />
            <button type="button" className="cart-text-button" onClick={copyMessage}>Copiar mensaje</button>
            <a className="action" href={whatsapp} target="_blank" rel="noopener noreferrer">Abrir WhatsApp del negocio</a>
          </section>
        )}
      </div>
    </form>
  );
}
