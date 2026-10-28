import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ChoiceItem, HousesItem } from '../content/schemas';
import { grade } from '../engine/grading';
import { ChoiceExercise } from './ChoiceExercise';
import { HousesExercise } from './HousesExercise';

const choice: ChoiceItem = {
  id: 't:katter',
  kind: 'choice',
  prompt: 'Två ___ sover.',
  hint: 'Two cats are sleeping.',
  answer: 'katter',
  options: ['katter', 'kattar', 'katt'],
  explain: 'Katt takes -er.',
  level: 'A1',
};

describe('ChoiceExercise', () => {
  it('returns the tapped option through onAnswer', () => {
    const onAnswer = vi.fn();
    render(<ChoiceExercise item={choice} result={null} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('button', { name: /kattar/ }));
    expect(onAnswer).toHaveBeenCalledWith('kattar');
  });

  it('picks options with number keys', () => {
    const onAnswer = vi.fn();
    render(<ChoiceExercise item={choice} result={null} onAnswer={onAnswer} />);
    fireEvent.keyDown(window, { key: '2' });
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(choice.options).toContain(onAnswer.mock.calls[0][0]);
  });

  it('marks the correct option with text, not only colour, once graded', () => {
    render(<ChoiceExercise item={choice} result={grade(choice, 'katt')} onAnswer={() => {}} />);
    expect(screen.getByRole('button', { name: /katter/ })).toHaveTextContent('✓ correct');
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });
});

describe('HousesExercise', () => {
  const houses: HousesItem = { id: 't:bil', kind: 'houses', prompt: 'en bil', answer: 2, level: 'A1' };
  it('shows five houses labelled with number and ending, and returns the group', () => {
    const onAnswer = vi.fn();
    render(<HousesExercise item={houses} result={null} onAnswer={onAnswer} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: /Group 2: -ar/ }));
    expect(onAnswer).toHaveBeenCalledWith(2);
  });
});

describe('TypeExercise', () => {
  it('inserts å/ä/ö from the letter buttons and submits the typed text', async () => {
    const { TypeExercise } = await import('./TypeExercise');
    const onAnswer = vi.fn();
    const item = { id: 't:t', kind: 'type' as const, prompt: 'Jag ___ en bok.', answer: 'läser', accept: [], level: 'A1' as const };
    render(<TypeExercise item={item} result={null} onAnswer={onAnswer} />);
    const input = screen.getByLabelText('Your answer') as HTMLInputElement;
    expect(input).toHaveAttribute('lang', 'sv');
    expect(input).toHaveAttribute('autocapitalize', 'off');
    fireEvent.change(input, { target: { value: 'l' } });
    input.setSelectionRange(1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'ä' }));
    expect(input.value).toBe('lä');
    fireEvent.change(input, { target: { value: 'läser' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith('läser');
  });
});

describe('OrderExercise', () => {
  it('builds the sentence from tapped tiles and returns them in order', async () => {
    const { OrderExercise, orderTiles } = await import('./OrderExercise');
    expect(orderTiles('Igår köpte hon en kaka.')).toEqual(['Igår', 'köpte', 'hon', 'en', 'kaka']);
    const onAnswer = vi.fn();
    const item = { id: 't:o', kind: 'order' as const, sentence: 'Hon är glad.', accept: [], en: 'She is happy.', level: 'A1' as const };
    render(<OrderExercise item={item} result={null} onAnswer={onAnswer} />);
    for (const w of ['Hon', 'är', 'glad']) fireEvent.click(within(screen.getByRole('group', { name: 'Words' })).getByRole('button', { name: new RegExp(w) }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith('Hon är glad');
  });
});

describe('MatchExercise', () => {
  const item = {
    id: 't:m',
    kind: 'match' as const,
    pairs: [
      ['en ost', 'cheese'],
      ['ett ägg', 'egg'],
      ['en lök', 'onion'],
      ['en kaka', 'cake'],
    ] as [string, string][],
    level: 'A1' as const,
  };
  const pair = (sv: string, en: string) => {
    fireEvent.click(within(screen.getByRole('group', { name: 'Swedish' })).getByRole('button', { name: sv }));
    fireEvent.click(within(screen.getByRole('group', { name: 'English' })).getByRole('button', { name: en }));
  };

  it('answers true when every pair is found without a mistake', async () => {
    const { MatchExercise } = await import('./MatchExercise');
    const onAnswer = vi.fn();
    render(<MatchExercise item={item} result={null} onAnswer={onAnswer} />);
    for (const [sv, en] of item.pairs) pair(sv, en);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('answers false after a wrong pairing', async () => {
    const { MatchExercise } = await import('./MatchExercise');
    const onAnswer = vi.fn();
    render(<MatchExercise item={item} result={null} onAnswer={onAnswer} />);
    pair('en ost', 'egg');
    for (const [sv, en] of item.pairs) pair(sv, en);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

describe('InfoTip', () => {
  const fun = { sv: 'Jag har två katter. Eller, de har mig.', en: 'I have two cats. Or rather, they have me.', note: 'A joke.' };

  it('stays hidden until the ⓘ is clicked, then closes on a second click or Escape', async () => {
    const { InfoTip } = await import('../components/InfoTip');
    render(<InfoTip fun={fun} />);
    const btn = screen.getByRole('button', { name: 'Show a funny example' });
    expect(screen.queryByText(fun.en)).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByText(fun.sv)).toHaveAttribute('lang', 'sv');
    expect(screen.getByText(fun.en)).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(screen.queryByText(fun.en)).toBeNull();
    fireEvent.click(btn);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(fun.en)).toBeNull();
  });

  it('renders nothing when there is no joke', async () => {
    const { InfoTip } = await import('../components/InfoTip');
    const { container } = render(<InfoTip />);
    expect(container).toBeEmptyDOMElement();
  });
});
