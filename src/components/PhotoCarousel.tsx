import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X, ZoomIn } from 'lucide-react';
import './PhotoCarousel.css';

const photos = [
  { name: 'bola-crujiente', alt: 'Bola crujiente con aguacate, cebolla y dos salsas en una bandeja' },
  { name: 'croqueta-crujiente', alt: 'Croqueta de sushi abierta con aguacate, salsa y relleno a la vista' },
  { name: 'bocados-crujientes', alt: 'Dos bolas crujientes en bandejas, una con cebolla y otra con aguacate', fullOnDesktop: true },
  { name: 'baku-y-fuego', alt: 'Bola de Fuego XL con cebolla crujiente servida sobre un plato, con llamas al fondo', wide: 900, fullOnDesktop: true },
];
const slides = [photos[photos.length - 1], ...photos, photos[0]];
const photoAt = (position: number) => (position - 1 + photos.length) % photos.length;
const asset = (name: string, size: '480' | '960' | 'ampliada') => `/assets/galeria/webp/${name}-${size}.webp`;

export function PhotoCarousel() {
  const [position, setPosition] = useState(1);
  const [snap, setSnap] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [visible, setVisible] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const viewport = useRef<HTMLDivElement>(null);
  const zoomButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const transition = useRef<number>();
  const swipe = useRef<{ x: number; y: number; pointer: number }>();
  const suppressClick = useRef(false);
  const index = photoAt(position);
  const photo = photos[index];
  const auto = playing && !reduced && visible && !hovered && !focused && !touching && !zoomed;

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const finish = useCallback(() => {
    if (transition.current === undefined) return;
    window.clearTimeout(transition.current);
    transition.current = undefined;
    // At the edges, swap the duplicate for the identical original without motion.
    setSnap(true);
    setPosition(current => photoAt(current) + 1);
  }, []);

  useEffect(() => () => window.clearTimeout(transition.current), []);
  useEffect(() => {
    if (reduced) finish();
  }, [reduced, finish]);

  const move = useCallback((target: number) => {
    if (transition.current !== undefined) return;
    setSnap(reduced);
    setPosition(reduced ? photoAt(target) + 1 : target);
    if (!reduced) transition.current = window.setTimeout(finish, 680);
  }, [finish, reduced]);

  useEffect(() => {
    if (!auto) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      if (!document.hidden) timer = window.setTimeout(() => move(index + 2), 4000);
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [auto, index, move]);

  function navigate(target: number) {
    setPlaying(false);
    if (target !== position) move(target);
  }

  function endSwipe(event: PointerEvent<HTMLButtonElement>) {
    if (swipe.current?.pointer !== event.pointerId) return;
    const dx = event.clientX - swipe.current.x;
    const dy = event.clientY - swipe.current.y;
    swipe.current = undefined;
    setTouching(false);
    if (event.type === 'pointercancel' || Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    suppressClick.current = true;
    navigate(position + (dx < 0 ? 1 : -1));
  }

  return (
    <section
      className="baku-gallery"
      aria-labelledby="baku-gallery-title"
      aria-roledescription="carrusel"
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={event => {
        if (zoomed || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        navigate(position + (event.key === 'ArrowLeft' ? -1 : 1));
      }}
    >
      <h2 id="baku-gallery-title">Así se ve tu Baku</h2>
      <div className="baku-gallery__viewport" ref={viewport}>
        <div
          className="baku-gallery__track"
          data-snap={snap}
          style={{ transform: `translateX(-${position * 100}%)` }}
          onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'transform') finish(); }}
          aria-hidden="true"
        >
          {slides.map(({ name, wide = 960, fullOnDesktop }, slot) => (
            <img
              key={slot}
              className={fullOnDesktop ? 'baku-gallery__image--full' : undefined}
              src={asset(name, '480')}
              srcSet={`${asset(name, '480')} 480w, ${asset(name, '960')} ${wide}w`}
              sizes="(max-width: 55rem) calc(100vw - 2rem), 52rem"
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ))}
        </div>
        <button
          type="button"
          ref={zoomButton}
          className="baku-gallery__photo"
          aria-label={`Ampliar foto ${index + 1}: ${photo.alt}`}
          onPointerDown={event => {
            suppressClick.current = false;
            if (event.pointerType !== 'touch' || !event.isPrimary) return;
            swipe.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
            setTouching(true);
          }}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
          onClick={event => {
            if (suppressClick.current && event.detail !== 0) {
              suppressClick.current = false;
              return;
            }
            setPlaying(false);
            setZoomed(true);
            dialog.current?.showModal();
            closeButton.current?.focus();
          }}
        >
          <span><ZoomIn aria-hidden="true" /> Ampliar foto</span>
        </button>
      </div>
      <div className="baku-gallery__controls">
        <button type="button" aria-label="Foto anterior" onClick={() => navigate(position - 1)}><ChevronLeft aria-hidden="true" /></button>
        <div className="baku-gallery__dots" role="group" aria-label="Elegir foto">
          {photos.map(({ name }, slot) => (
            <button
              key={name}
              type="button"
              aria-label={`Ver foto ${slot + 1} de ${photos.length}`}
              aria-current={slot === index ? 'true' : undefined}
              onClick={() => navigate(slot + 1)}
            />
          ))}
        </div>
        <button type="button" aria-label="Foto siguiente" onClick={() => navigate(position + 1)}><ChevronRight aria-hidden="true" /></button>
        {!reduced && (
          <button type="button" aria-label={playing ? 'Pausar reproducción automática' : 'Reanudar reproducción automática'} onClick={() => setPlaying(!playing)}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
        )}
      </div>
      <p className="sr-only" aria-live={auto ? 'off' : 'polite'}>Foto {index + 1} de {photos.length}. {photo.alt}</p>
      <dialog
        ref={dialog}
        className="baku-gallery__dialog"
        aria-label="Foto ampliada de BAKU-BAKU"
        onClose={() => {
          setZoomed(false);
          zoomButton.current?.focus();
        }}
      >
        <button ref={closeButton} type="button" aria-label="Cerrar foto ampliada" onClick={() => dialog.current?.close()}>
          <X aria-hidden="true" />
        </button>
        {zoomed && <img src={asset(photo.name, 'ampliada')} alt={photo.alt} decoding="async" />}
      </dialog>
    </section>
  );
}
