import { TileLayer } from 'react-leaflet'

/** Public Esri Light Gray canvas — no API key. Replaces retired CARTO raster tiles. */
export const LIGHT_BASEMAP_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
export const LIGHT_BASEMAP_LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
export const LIGHT_BASEMAP_ATTRIBUTION =
  'Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS'

export function LightBasemapLayers() {
  return (
    <>
      <TileLayer attribution={LIGHT_BASEMAP_ATTRIBUTION} url={LIGHT_BASEMAP_URL} maxZoom={16} />
      <TileLayer url={LIGHT_BASEMAP_LABELS_URL} maxZoom={16} />
    </>
  )
}
