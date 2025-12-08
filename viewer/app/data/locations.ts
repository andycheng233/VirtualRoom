import { Location } from "../types/game";

export const YALE_LOCATIONS: Location[] = [
  {
    id: "je-courtyard",
    name: "Jonathan Edwards Courtyard",
    coordinates: { lat: 41.309115, lng: -72.930515 },

    panoramaPath: "/panoramas/je_courtyard_panorama.jpg",
  },
  // Add more locations as panoramas are created:
  // {
  //   id: "sterling-library",
  //   name: "Sterling Memorial Library",
  //   coordinates: { lat: 41.3111, lng: -72.9289 },
  //   panoramaPath: "/panoramas/sterling.jpg",
  // },
];

export const YALE_MAP_CENTER = { lat: 41.3111, lng: -72.9267 };

export const YALE_MAP_BOUNDS = {
  north: 41.32,
  south: 41.3,
  east: -72.91,
  west: -72.94,
};
