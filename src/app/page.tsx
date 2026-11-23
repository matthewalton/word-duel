import { GameScreen } from "@/components/GameScreen";
import { GAME_NAME } from "@/config/game";
import styles from "@/components/game.module.css";

export default function Home() {
  return (
    <>
      <h1 className={styles.title}>{GAME_NAME}</h1>
      <GameScreen />
    </>
  );
}
