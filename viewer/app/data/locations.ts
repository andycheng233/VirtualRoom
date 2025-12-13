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
  {
    id: "morse-underground",
    name: "Morse/Stiles Underground",
    coordinates: { lat: 41.31264622701182, lng:-72.93057930400711},
    panoramaPath: "/panoramas/morse_stiles_custom_pano.png",
  },
  {
    id: "berk-courtyard",
    name: "Berkeley Courtyard",
    coordinates: { lat: 41.310395299585736, lng: -72.92807009414972 },
    panoramaPath: "/panoramas/berk_custom_pano.png",
  },
  {
    id: "mary-church",
    name: "St. Mary's Church",
    coordinates: { lat: 41.31181348252675, lng: -72.92390043425047 },
    panoramaPath: "/panoramas/mary_custom_pano.png",
  },
  {
    id: "frank-courtyard",
    name: "Franklin Courtyard",
    coordinates: { lat: 41.31503557418407, lng: -72.92562036132698 },
    panoramaPath: "/panoramas/frank_custom_pano.png",
  },
  {
    id: "hq",
    name: "Humanities Quadrangle",
    coordinates: { lat: 41.3121224329615, lng: -72.92941187713613 },
    panoramaPath: "/panoramas/hq_custom_pano.png",
  },
  {
    id: "marsh",
    name: "Marsh Lecture Hall",
    coordinates: { lat: 41.317065368995486, lng: -72.92224630118922},
    panoramaPath: "/panoramas/marsh_custom_pano.png",
  },
  {
    id: "pwg",
    name: "Payne Whitney Gymnasium",
    coordinates: { lat: 41.313600939622475, lng: -72.93067352924064 },
    panoramaPath: "/panoramas/pwg_custom_pano.png",
  },
  {
    id: "rosenkranz",
    name: "Rosenkranz Hall",
    coordinates: { lat: 41.31446861116102, lng: -72.92459087986056},
    panoramaPath: "/panoramas/rosenkranz_custom_pano.png",
  },
  {
    id: "schwarzman",
    name: "Schwarzman Center",
    coordinates: {lat:41.31163103367377, lng: -72.92584579700396},
    panoramaPath: "/panoramas/schwarzman_custom_pano.png",
  },
  {
    id: "watson",
    name: "Watson Center",
    coordinates: { lat: 41.3158165574733, lng: -72.92380217291058},
    panoramaPath: "/panoramas/watson_custom_pano.png",
  },
];

export const YALE_MAP_CENTER = { lat: 41.3111, lng: -72.9267 };

export const YALE_MAP_BOUNDS = {
  north: 41.32,
  south: 41.3,
  east: -72.91,
  west: -72.94,
};
