import type { Item } from '../content/schemas';
import { ChoiceExercise } from './ChoiceExercise';
import { HousesExercise } from './HousesExercise';
import { ListenExercise } from './ListenExercise';
import { MatchExercise } from './MatchExercise';
import { OrderExercise } from './OrderExercise';
import { TypeExercise } from './TypeExercise';
import type { ExerciseProps } from './types';

/** Renders the component for an item’s kind. Keep in sync with PLAYABLE_KINDS. */
export function Exercise({ item, ...rest }: ExerciseProps) {
  switch (item.kind) {
    case 'choice':
      return <ChoiceExercise item={item} {...rest} />;
    case 'houses':
      return <HousesExercise item={item} {...rest} />;
    case 'type':
      return <TypeExercise item={item} {...rest} />;
    case 'order':
      return <OrderExercise item={item} {...rest} />;
    case 'listen':
      return <ListenExercise item={item} {...rest} />;
    case 'match':
      return <MatchExercise item={item} {...rest} />;
    default:
      return <p className="muted">This exercise type arrives in a later phase.</p>;
  }
}

/** The Swedish prompt shown above the exercise, if any. */
export const exercisePrompt = (item: Item): string | null => {
  switch (item.kind) {
    case 'choice':
    case 'houses':
    case 'type':
      return item.prompt || null;
    default:
      return null;
  }
};

/** English help under the prompt. */
export const exerciseHint = (item: Item): string | undefined => (item.kind === 'order' ? (item.hint ?? item.en) : item.hint);

/** Default instruction when the item has no ask. */
export const exerciseAsk = (item: Item): string | undefined =>
  item.ask ?? (item.kind === 'order' ? 'Put the words in order.' : item.kind === 'type' ? 'Type the missing word.' : undefined);
