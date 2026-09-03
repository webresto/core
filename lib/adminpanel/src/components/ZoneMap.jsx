import React, { useEffect, useRef, useState } from 'react';
import olCss from 'ol/ol.css?inline';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import XYZ from 'ol/source/XYZ.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import Draw from 'ol/interaction/Draw.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import Modify from 'ol/interaction/Modify.js';
import Snap from 'ol/interaction/Snap.js';
import { fromLonLat } from 'ol/proj.js';
import { createEmpty, extend, isEmpty } from 'ol/extent.js';
import { Fill, Stroke, Style, Text, Circle as CircleStyle } from 'ol/style.js';
import Attribution from 'ol/control/Attribution.js';
import Zoom from 'ol/control/Zoom.js';
import { geometryToRing, isUsableRing, ringToGeometry } from './zone-ring';

/**
 * Drawing a delivery zone.
 *
 * Zones only make sense next to each other — a gap between two of them is an
 * address nobody delivers to, and an overlap is a tariff decided by sort order.
 * So the zone being edited is drawn on top of all the others rather than alone,
 * which is the whole reason this exists instead of a coordinate list.
 *
 * Rings travel as `[lon, lat]` in EPSG:4326, the order KML uses and the one the
 * database stores. OpenLayers works in EPSG:3857, so every ring is converted on
 * the way in and on the way out; nothing outside this file sees a projection.
 */

// The stylesheet ships inside the bundle. Admin modules are fetched with a bare
// `import(url)` from another origin, so a separately emitted CSS file would
// never be requested and the zoom buttons would come out unstyled.
let stylesInjected = false;
function injectOlStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.dataset.source = 'openlayers';
  style.textContent = olCss;
  document.head.appendChild(style);
  stylesInjected = true;
}

const EDIT_STYLE = new Style({
  fill: new Fill({ color: 'rgba(56, 132, 255, 0.30)' }),
  stroke: new Stroke({ color: '#1f5fd0', width: 2.5 }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: '#ffffff' }),
    stroke: new Stroke({ color: '#3884ff', width: 2 }),
  }),
});

// The zones that are not being edited. Dashed to stay distinguishable from the
// one that is, but dark enough to be followed across a pale basemap — at the
// previous 10% grey they disappeared into the tiles.
const CONTEXT_STYLE = new Style({
  fill: new Fill({ color: 'rgba(70, 90, 120, 0.22)' }),
  stroke: new Stroke({ color: 'rgba(35, 55, 85, 0.95)', width: 1.75, lineDash: [6, 4] }),
});

// The one the cursor is over in the list. Amber rather than a stronger blue:
// blue is what "being edited" means here, and pointing at a row is not editing
// it. Solid, because the dashes are what say "not this one".
const HOVER_STYLE = new Style({
  fill: new Fill({ color: 'rgba(245, 158, 11, 0.35)' }),
  stroke: new Stroke({ color: '#b45309', width: 3 }),
});

// A kitchen. Drawn above the polygons and never picked by anything: it is here
// to answer “where is this zone relative to the people cooking for it”, which
// is the question an operator has open while dragging a boundary.
//
// A kitchen belongs to no city, so this layer can show a point the current
// city has nothing to do with. That is the honest picture — the alternative is
// hiding a kitchen that does serve the zone — and it is also why the opening
// view below still ignores these points unless there is nothing else to fit.
function kitchenStyle(feature, dark) {
  const off = feature.get('enable') === false;
  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: off ? 'rgba(120, 120, 120, 0.55)' : 'rgba(220, 38, 38, 0.9)' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
    text: new Text({
      text: feature.get('title') || '',
      offsetY: -14,
      font: '12px sans-serif',
      fill: new Fill({ color: dark ? '#f5f5f5' : '#1f2937' }),
      stroke: new Stroke({ color: dark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)', width: 3 }),
    }),
  });
}

export default function ZoneMap({
  value,
  onChange,
  readOnly = false,
  readOnlyHint,
  otherZones = [],
  highlightIds = [],
  points = [],
  onZoneActivate,
  onZoneHover,
  dark = false,
  tileUrl,
  attribution,
  t = (key) => key,
}) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const editSource = useRef(null);
  const drawRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onZoneActivateRef = useRef(onZoneActivate);
  const onZoneHoverRef = useRef(onZoneHover);
  // What the last pointermove reported. Moving inside one polygon fires the
  // event on every pixel, and only crossing a boundary is news.
  const hoveredIdRef = useRef(null);
  // Read by the style function, which is created once with the layer. Keeping
  // the set in a ref rather than rebuilding the layer means hovering a row
  // repaints the features instead of dropping and re-adding all of them.
  const highlightRef = useRef(new Set());
  const [hasRing, setHasRing] = useState(() => isUsableRing(value));

  // The interactions are created once and keep the first callback otherwise.
  onChangeRef.current = onChange;
  onZoneActivateRef.current = onZoneActivate;
  onZoneHoverRef.current = onZoneHover;

  useEffect(() => {
    injectOlStyles();
    if (!container.current) return undefined;

    const source = new VectorSource();
    editSource.current = source;

    const contextSource = new VectorSource();
    const kitchenSource = new VectorSource();

    const map = new Map({
      target: container.current,
      controls: [new Zoom(), new Attribution({ collapsible: false })],
      // Without this a double click on a zone would open its terms *and* zoom
      // one step in, every time.
      interactions: defaultInteractions({ doubleClickZoom: false }),
      layers: [
        new TileLayer({
          source: new XYZ({
            url: tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            attributions: attribution || undefined,
            crossOrigin: 'anonymous',
            maxZoom: 19,
          }),
        }),
        new VectorLayer({
          source: contextSource,
          style: (feature) => (highlightRef.current.has(feature.get('zoneId')) ? HOVER_STYLE : CONTEXT_STYLE),
        }),
        new VectorLayer({ source, style: EDIT_STYLE }),
        new VectorLayer({ source: kitchenSource, style: (feature) => kitchenStyle(feature, dark) }),
      ],
      view: new View({ center: fromLonLat([0, 20]), zoom: 2 }),
    });
    mapRef.current = map;
    map.set('contextSource', contextSource);
    map.set('contextLayer', map.getLayers().item(1));
    map.set('kitchenSource', kitchenSource);

    return () => {
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
      editSource.current = null;
    };
    // Rebuilding the map for a tile URL change is fine: it only changes when an
    // operator edits the setting, and the alternative is a stale layer.
  }, [tileUrl, attribution, dark]);

  // The zone being edited.
  useEffect(() => {
    const source = editSource.current;
    if (!source) return;

    const usable = isUsableRing(value);
    setHasRing(usable);
    source.clear();
    if (usable) source.addFeature(new Feature(ringToGeometry(value)));
  }, [value]);

  // Everything else, as context.
  //
  // Keyed by content and not by the array, which the page rebuilds on every
  // render: pointing at a zone is a render, and dropping and re-adding every
  // feature under the cursor made the shapes flicker while the mouse crossed
  // them. Same idiom as `fitKey` below.
  const contextKey = JSON.stringify(otherZones.map((zone) => [zone.id, zone.polygon]));
  useEffect(() => {
    const map = mapRef.current;
    const contextSource = map?.get('contextSource');
    if (!contextSource) return;

    contextSource.clear();
    for (const zone of otherZones) {
      if (!isUsableRing(zone.polygon)) continue;
      const feature = new Feature(ringToGeometry(zone.polygon));
      feature.set('zoneId', zone.id);
      contextSource.addFeature(feature);
    }
  }, [contextKey]);

  // The kitchens.
  useEffect(() => {
    const kitchenSource = mapRef.current?.get('kitchenSource');
    if (!kitchenSource) return;

    kitchenSource.clear();
    for (const point of points) {
      const feature = new Feature(new Point(fromLonLat([point.lon, point.lat])));
      feature.set('title', point.title);
      feature.set('enable', point.enable);
      kitchenSource.addFeature(feature);
    }
  }, [points]);

  // Pointing at a zone on the map, which is the same statement as pointing at
  // its row in the list — the list highlights from here, the map highlights
  // from `highlightIds`, and neither end knows where the mouse is.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const report = (zoneId) => {
      if (hoveredIdRef.current === zoneId) return;
      hoveredIdRef.current = zoneId;
      onZoneHoverRef.current?.(zoneId);
    };

    const move = (event) => {
      // Dragging the map, or a vertex, is not pointing at anything.
      if (event.dragging) return;
      report(map.forEachFeatureAtPixel(event.pixel, (feature) => feature.get('zoneId')) ?? null);
    };
    const leave = () => report(null);

    map.on('pointermove', move);
    map.getViewport().addEventListener('pointerleave', leave);
    return () => {
      map.un('pointermove', move);
      map.getViewport().removeEventListener('pointerleave', leave);
      report(null);
    };
    // The same dependencies the map is built on: a rebuilt map is a new
    // viewport, and this listener would otherwise stay on the disposed one.
  }, [tileUrl, attribution, dark]);

  // Opening the terms of a zone from the map.
  //
  // Only while the map is read-only. In the editing mode a double click is the
  // gesture that closes a polygon, and `Draw` owns it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readOnly) return undefined;

    const open = (event) => {
      const zoneId = map.forEachFeatureAtPixel(event.pixel, (feature) => feature.get('zoneId'));
      if (zoneId) onZoneActivateRef.current?.(zoneId);
    };
    map.on('dblclick', open);
    return () => map.un('dblclick', open);
  }, [readOnly]);

  // Pointing at a row in the list.
  const highlightKey = highlightIds.join(',');
  useEffect(() => {
    highlightRef.current = new Set(highlightIds);
    mapRef.current?.get('contextLayer')?.changed();
  }, [highlightKey]);

  // Drawing and reshaping, unless somebody else owns the geometry.
  useEffect(() => {
    const map = mapRef.current;
    const source = editSource.current;
    if (!map || !source || readOnly) return undefined;

    const commit = () => {
      const [feature] = source.getFeatures();
      if (!feature) return;
      onChangeRef.current?.(geometryToRing(feature.getGeometry()));
    };

    const modify = new Modify({ source });
    modify.on('modifyend', commit);
    map.addInteraction(modify);

    const draw = new Draw({ source, type: 'Polygon' });
    draw.on('drawstart', () => source.clear());
    draw.on('drawend', (event) => {
      // The feature is not in the source yet, so read it off the event.
      onChangeRef.current?.(geometryToRing(event.feature.getGeometry()));
      setHasRing(true);
      draw.setActive(false);
    });
    draw.setActive(!hasRing);
    drawRef.current = draw;
    map.addInteraction(draw);

    const snap = new Snap({ source });
    map.addInteraction(snap);

    return () => {
      map.removeInteraction(snap);
      map.removeInteraction(draw);
      map.removeInteraction(modify);
      drawRef.current = null;
    };
  }, [readOnly, hasRing]);

  // Opening view: this zone, else the neighbours, else the kitchens.
  const fitKey = JSON.stringify([
    isUsableRing(value) ? value : null,
    otherZones.map((zone) => zone.id),
    points.length,
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const extent = createEmpty();
    if (isUsableRing(value)) {
      extend(extent, ringToGeometry(value).getExtent());
    } else {
      let fitted = false;
      for (const zone of otherZones) {
        if (!isUsableRing(zone.polygon)) continue;
        extend(extent, ringToGeometry(zone.polygon).getExtent());
        fitted = true;
      }

      // Kitchens are the fallback and not an addition. They belong to no city,
      // so a kitchen in one and zones in another stretched the opening view
      // across everything between them — which is how a city with five zones in
      // Vietnam opened on a map of Asia.
      if (!fitted) {
        for (const point of points) {
          const coordinate = fromLonLat([point.lon, point.lat]);
          extend(extent, [coordinate[0], coordinate[1], coordinate[0], coordinate[1]]);
        }
      }
    }

    if (isEmpty(extent)) return;
    map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 15, duration: 0 });
    // Only when the map is opened on a different zone: refitting on every vertex
    // drag would fight the operator for control of the viewport.
  }, [fitKey]);

  const clear = () => {
    editSource.current?.clear();
    setHasRing(false);
    drawRef.current?.setActive(true);
    onChangeRef.current?.([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        ref={container}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          background: 'var(--muted)',
        }}
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, opacity: 0.75, padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
        {readOnly
          ? <span>{readOnlyHint ?? t('The geometry is maintained in the source; the map is read-only here.')}</span>
          : (
            <>
              <span>
                {hasRing
                  ? t('Drag a vertex to reshape the zone. Drag the middle of an edge to add one.')
                  : t('Click to place the corners of the zone, and click the first one again to close it.')}
              </span>
              {hasRing && (
                <button
                  type="button"
                  onClick={clear}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--destructive)',
                    textDecoration: 'underline',
                    font: 'inherit',
                  }}
                >
                  {t('Draw it again')}
                </button>
              )}
            </>
          )}
      </div>
    </div>
  );
}
