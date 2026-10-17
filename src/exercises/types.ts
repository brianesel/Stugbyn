import type { Item } from '../content/schemas';
import type { Answer, GradeResult } from '../engine/grading';

/** The one interface every exercise component implements. Components never touch storage. */
export type ExerciseProps<I extends Item = Item> = {
  item: I;
  /** Set once the answer has been graded; the component then shows what was right. */
  result: GradeResult | null;
  onAnswer(answer: Answer): void;
};
