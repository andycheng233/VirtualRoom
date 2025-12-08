"use client";

import { useGame } from "./context/GameContext";
import StartScreen from "./components/game/StartScreen";
import GameContainer from "./components/game/GameContainer";
import GameOverScreen from "./components/game/GameOverScreen";

export default function Home() {
  const { state } = useGame();

  if (state.status === "idle") {
    return <StartScreen />;
  }

  if (state.status === "game_over") {
    return <GameOverScreen />;
  }

  return <GameContainer />;
}
