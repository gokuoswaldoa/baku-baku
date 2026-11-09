import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { cartTotals, type CartItem } from '../cart';
import { checkoutMessage, readCheckout } from '../checkout';
import { checkoutSubmissionBody, checkoutSubmissionEnabled, registerCheckout } from '../checkout-submission';
import { availability, business, deliveryReference, deliveryTotalEstimate, modalities, whatsapp } from '../order-config';
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

interface Submission {
  key: string;
  body: string;
  message: string;
  subtotalCents: number;
}

export function OrderCheckout({ items, blocked, editing, validateItems }: Props) {
  const [modality, setModality] = useState<keyof typeof modalities>('recogida');
  const [preview, setPreview] = useState<{ items: CartItem[]; message: string }>();
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const pending = useRef<Submission>();
  const registered = useRef<{ body: string; message: string }>();
  const inFlight = useRef(false);
  const lastWhatsAppOpen = useRef(-Infinity);
  const previewTitle = useRef<HTMLHeadingElement>(null);
  const previewText = useRef<HTMLTextAreaElement>(null);
  const totals = cartTotals(items);
  const message = checkoutSubmissionEnabled || (preview?.items === items && !blocked && !editing)
    ? preview?.message : undefined;

  useEffect(() => {
    if (message) previewTitle.current?.focus();
  }, [message]);

  function clearPreview() {
    if (checkoutSubmissionEnabled && (pending.current || registered.current)) return;
    setPreview(undefined);
    setFeedback('');
  }

  async function submit(attempt: Submission) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setPreview(undefined);
    setFeedback('Registrando la solicitud…');
    try {
      const result = await registerCheckout(attempt.key, attempt.body, attempt.subtotalCents);
      setCanRetry(result.kind === 'retry');
      if (result.kind === 'retry') {
        setFeedback('No pudimos comprobar el registro. Reintenta la misma solicitud para evitar un duplicado.');
        return;
      }
      pending.current = undefined;
      if (result.kind === 'invalid') {
        setFeedback('El negocio no pudo registrar esta combinación. Revisa tus datos y la disponibilidad antes de intentar de nuevo.');
      } else if (result.kind === 'conflict') {
        setFeedback('No pudimos comprobar el folio de esta solicitud. Consulta al negocio antes de volver a enviarla.');
        pending.current = attempt;
      } else {
        const message = 'Folio de solicitud: ' + result.folio + '\n\n' + attempt.message;
        registered.current = { body: attempt.body, message };
        setPreview({ items, message });
        setFeedback('Solicitud registrada. Envía el folio por WhatsApp para confirmar con el negocio.');
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || pending.current) return;
    clearPreview();
    if (!items.length || blocked || editing || !validateItems()) return;
    const details = readCheckout(new FormData(event.currentTarget), modality);
    if (!details) {
      setFeedback('Revisa el contacto y, para entrega, la dirección y las coordenadas del pin.');
      return;
    }
    const message = checkoutMessage(items, details);
    if (!checkoutSubmissionEnabled) {
      setPreview({ items, message });
      return;
    }
    const body = checkoutSubmissionBody(items, details);
    if (registered.current?.body === body) {
      setPreview({ items, message: registered.current.message });
      return;
    }
    const attempt = { key: crypto.randomUUID(), body, message, subtotalCents: totals.subtotal * 100 };
    pending.current = attempt;
    void submit(attempt);
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setFeedback('Pedido copiado. Si el mensaje no aparece en WhatsApp, pégalo en el chat del negocio.');
    } catch {
      previewText.current?.focus();
      previewText.current?.select();
      setFeedback('No se pudo copiar automáticamente. Copia el texto seleccionado y pégalo en WhatsApp.');
    }
  }

  return (
    <form className="cart-checkout" autoComplete="off" onChange={clearPreview} onSubmit={prepare}>
      <div className="cart-subtotal" aria-live="polite">
        <p>{totals.quantity} bolas en total</p>
        <strong>Subtotal de productos: ${totals.subtotal} MXN</strong>
        {modality === 'entrega' && totals.quantity > 0 && (
          <>
            <p className="order-note">{deliveryReference}</p>
            <p className="order-note">{deliveryTotalEstimate(totals.subtotal)} {availability.delivery}</p>
          </>
        )}
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
            <p className="order-note">Cobertura de entrega: {business.deliveryCoverage}.</p>
          </>
        ) : <p className="order-note">{availability.pickup}</p>}
      </div>
      <div>
        <button className="action" type="submit" disabled={!items.length || blocked || editing || Boolean(pending.current)}>
          <MessageCircle aria-hidden="true" /> {checkoutSubmissionEnabled ? 'Registrar solicitud' : 'Revisar pedido para WhatsApp'}
        </button>
        {canRetry && (
          <button className="cart-text-button" type="button" disabled={sending} onClick={() => {
            if (pending.current) void submit(pending.current);
          }}>Reintentar registro</button>
        )}
        <p className="order-note">{editing ? 'Guarda o cancela la edición antes de enviar.' : availability.orderNote}</p>
        <p className="order-note" role="status">{feedback}</p>
        {message && (
          <section className="checkout-preview" aria-labelledby="checkout-preview-title">
            <h3 id="checkout-preview-title" ref={previewTitle} tabIndex={-1}>Resumen para el negocio</h3>
            <p className="order-note">WhatsApp abrirá con los datos del pedido listos para enviar. Pulsa Enviar en el chat.</p>
            <textarea ref={previewText} aria-label="Mensaje de WhatsApp del pedido" readOnly rows={9} value={message} />
            <a
              className="action"
              href={whatsapp + '?text=' + encodeURIComponent(message)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={event => {
                const now = performance.now();
                if (now - lastWhatsAppOpen.current < 1000) {
                  event.preventDefault();
                  return;
                }
                lastWhatsAppOpen.current = now;
              }}
            >Enviar pedido por WhatsApp</a>
            <button type="button" className="cart-text-button" onClick={copyMessage}>Copiar pedido</button>
          </section>
        )}
      </div>
    </form>
  );
}
