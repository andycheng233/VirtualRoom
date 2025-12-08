"use client";

import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  Dispatch,
} from "react";
import { GameState, Location } from "../types/game";
import { YALE_LOCATIONS } from "../data/locations";
import { calculateDistance, calculateScore } from "../utils/scoring";

type GameAction =
  | { type: "START_GAME"; payload: { totalRounds: number } }
  | { type: "SUBMIT_GUESS"; payload: { lat: number; lng: number } }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_GAME" };

const initialState: GameState = {
  status: "idle",
  currentRound: 0,
  totalRounds: 5,
  rounds: [],
  totalScore: 0,
  locations: [],
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const shuffled = shuffleArray(YALE_LOCATIONS);
      const numRounds = Math.min(action.payload.totalRounds, shuffled.length);
      const selected = shuffled.slice(0, numRounds);

      return {
        status: "playing",
        currentRound: 0,
        totalRounds: numRounds,
        totalScore: 0,
        locations: selected,
        rounds: selected.map((loc) => ({
          locationId: loc.id,
          guess: null,
          distance: null,
          score: null,
        })),
      };
    }

    case "SUBMIT_GUESS": {
      const currentLocation = state.locations[state.currentRound];
      const distance = calculateDistance(
        action.payload.lat,
        action.payload.lng,
        currentLocation.coordinates.lat,
        currentLocation.coordinates.lng
      );
      const score = calculateScore(distance);

      const updatedRounds = [...state.rounds];
      updatedRounds[state.currentRound] = {
        ...updatedRounds[state.currentRound],
        guess: action.payload,
        distance,
        score,
      };

      return {
        ...state,
        status: "round_result",
        rounds: updatedRounds,
        totalScore: state.totalScore + score,
      };
    }

    case "NEXT_ROUND": {
      const nextRound = state.currentRound + 1;
      if (nextRound >= state.totalRounds) {
        return { ...state, status: "game_over" };
      }
      return {
        ...state,
        status: "playing",
        currentRound: nextRound,
      };
    }

    case "RESET_GAME":
      return initialState;

    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
