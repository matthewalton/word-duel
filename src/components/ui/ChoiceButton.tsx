import { Button, type ButtonProps } from "./Button";
import u from "./ui.module.css";

/** How a choice was judged once the round resolved; none while it is open. */
export type ChoiceMark = "right" | "wrong" | "reveal";

const MARK_CLASS: Record<ChoiceMark, string> = {
  right: u.choiceRight,
  wrong: u.choiceWrong,
  reveal: u.choiceReveal,
};

/**
 * One option of a pick-one prompt (Gap Guard): a white tile in the words
 * font with its number key in the corner. `mark` colours it once judged.
 */
export function ChoiceButton({
  keyNumber,
  mark,
  className,
  children,
  ...props
}: Omit<ButtonProps, "variant"> & { keyNumber: number; mark?: ChoiceMark }) {
  return (
    <Button className={`${u.choice} ${mark ? MARK_CLASS[mark] : ""} ${className ?? ""}`} {...props}>
      <span className={u.choiceKey} aria-hidden="true">
        {keyNumber}
      </span>
      {children}
    </Button>
  );
}
