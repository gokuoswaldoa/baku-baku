import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { parsePin, type DeliveryPin } from '../checkout';
import 'leaflet/dist/leaflet.css';

const tileUrl = import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function PinMap({ point, onPick }: { point: DeliveryPin | null; onPick: (point: DeliveryPin) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<{ library: typeof import('leaflet'); map: LeafletMap; marker?: Marker }>();
  const pick = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const latitude = point?.latitude;
  const longitude = point?.longitude;

  useEffect(() => { pick.current = onPick; }, [onPick]);

  useEffect(() => {
    let disposed = false;
    import('leaflet').then(library => {
      if (disposed || !element.current) return;
      const map = library.map(element.current, { scrollWheelZoom: false, maxZoom: 19 })
        .setView([18.85, -99.23], 14);
      instance.current = { library, map };
      let hasTiles = false;
      const tiles = library.tileLayer(tileUrl, {
        maxNativeZoom: 16,
        maxZoom: 19,
        referrerPolicy: 'strict-origin-when-cross-origin',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on('tileload', () => { hasTiles = true; });
      tiles.on('tileerror', () => setFailed(true));
      tiles.addTo(map);
      map.on('click', event => {
        if (hasTiles) pick.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
      setReady(true);
    }).catch(() => { if (!disposed) setFailed(true); });

    return () => {
      disposed = true;
      instance.current?.map.remove();
      instance.current = undefined;
    };
  }, []);

  useEffect(() => {
    const active = instance.current;
    if (!ready || !active) return;
    if (latitude === undefined || longitude === undefined) {
      active.marker?.remove();
      active.marker = undefined;
      return;
    }
    const position = active.library.latLng(latitude, longitude);
    if (!active.marker) {
      active.marker = active.library.marker(position, {
        draggable: true,
        alt: 'Pin de entrega',
        icon: active.library.divIcon({ className: 'delivery-pin-marker', iconSize: [24, 24], iconAnchor: [12, 12] }),
      }).addTo(active.map);
      const marker = active.marker;
      marker.on('dragend', () => {
        const pin = marker.getLatLng();
        pick.current({ latitude: pin.lat, longitude: pin.lng });
      });
    } else {
      active.marker.setLatLng(position);
    }
    if (!active.map.getBounds().contains(position)) active.map.panTo(position, { animate: false });
  }, [ready, latitude, longitude]);

  return (
    <>
      <div ref={element} className="delivery-map" role="region" aria-label="Mapa para seleccionar el pin" />
      {failed && <p role="status">El mapa no pudo cargar por completo. Puedes introducir las coordenadas debajo.</p>}
      <p className="order-note"><a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Reportar un problema del mapa</a></p>
    </>
  );
}

export function DeliveryLocation({ onChange }: { onChange: () => void }) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState('');
  const request = useRef(0);
  const point = parsePin(latitude, longitude);

  useEffect(() => () => { request.current++; }, []);

  function selectPin(pin: DeliveryPin) {
    request.current++;
    setLocating(false);
    setLatitude(pin.latitude.toFixed(6));
    setLongitude(pin.longitude.toFixed(6));
    setStatus('Pin seleccionado.');
    onChange();
  }

  function locate() {
    if (!navigator.geolocation) {
      setStatus('La ubicación actual no está disponible. Introduce las coordenadas manualmente.');
      return;
    }
    const current = ++request.current;
    setLocating(true);
    setStatus('Esperando permiso y ubicación.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { if (request.current === current) selectPin(coords); },
      () => {
        if (request.current !== current) return;
        setLocating(false);
        setStatus('No se obtuvo tu ubicación. Puedes colocar el pin o escribir las coordenadas.');
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }

  function changeCoordinate(update: (value: string) => void, value: string) {
    request.current++;
    setLocating(false);
    setStatus('');
    update(value);
    onChange();
  }

  return (
    <fieldset className="checkout-location" aria-describedby="delivery-pin-help">
      <legend>Pin de entrega (obligatorio)</legend>
      <p id="delivery-pin-help" className="order-note">Coloca o arrastra el pin en el mapa. También puedes escribir las coordenadas decimales, incluso sin mapa.</p>
      <div className="checkout-map-actions">
        <button type="button" className="cart-text-button" aria-expanded={showMap} onClick={() => setShowMap(value => !value)}>
          {showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
        </button>
        <button type="button" className="cart-text-button" disabled={locating} onClick={locate}>Usar mi ubicación actual</button>
      </div>
      <p className="order-note">Al mostrar el mapa, OpenStreetMap recibe solicitudes de las imágenes de la zona visible. El navegador pedirá permiso para usar tu ubicación.</p>
      {showMap && <PinMap point={point} onPick={selectPin} />}
      <div className="checkout-field-grid">
        <label className="modality">Latitud
          <input name="latitude" inputMode="decimal" required maxLength={20} value={latitude} onChange={event => changeCoordinate(setLatitude, event.target.value)} />
        </label>
        <label className="modality">Longitud
          <input name="longitude" inputMode="decimal" required maxLength={20} value={longitude} onChange={event => changeCoordinate(setLongitude, event.target.value)} />
        </label>
      </div>
      <p className="order-note" role="status">{status || ((latitude || longitude) && !point ? 'Ingresa una latitud entre −90 y 90 y una longitud entre −180 y 180.' : '')}</p>
    </fieldset>
  );
}
