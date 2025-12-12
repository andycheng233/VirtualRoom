import { Location } from "../types/game";

export const YALE_LOCATIONS: Location[] = [
  {
    id: "je-courtyard",
    name: "Jonathan Edwards Courtyard",
    coordinates: { lat: 41.309115, lng: -72.930515 },
    panoramaPath: "/panoramas/je_custom_pano.png",
  },
  {
    id: "becton-center",
    name: "Becton Center",
    coordinates: { lat: 41.312466, lng: -72.9251862 },
    panoramaPath: "/panoramas/becton_custom_pano.png",
  },
];

export const YALE_MAP_CENTER = { lat: 41.3111, lng: -72.9267 };

export const YALE_MAP_BOUNDS = {
  north: 41.32,
  south: 41.3,
  east: -72.91,
  west: -72.94,
};
