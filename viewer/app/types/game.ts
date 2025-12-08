export interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  panoramaPath: string;
}

export interface GameRound {
  locationId: string;
  guess: {
    lat: number;
    lng: number;
  } | null;
  distance: number | null;
  score: number | null;
}

export interface GameState {
  status: "idle" | "playing" | "round_result" | "game_over";
  currentRound: number;
  totalRounds: number;
  rounds: GameRound[];
  totalScore: number;
  locations: Location[];
}
