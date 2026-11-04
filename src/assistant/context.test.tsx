import { render, screen } from '@testing-library/react';
import { library } from '../content/load';
import { RichText } from '../screens/Helper';
import { buildContext } from './context';

describe('writing helper context', () => {
  it('sends a theme’s practised words and lists the rest in the summary', () => {
    const deck = library.decks.find((d) => d.theme === 'climbing')!;
    const first = deck.entries[0];
    const itemId = deck.items.find((i) => i.id.startsWith(`${first.id}:`))!.id;
    const ctx = buildContext('deck:climbing', { [itemId]: { box: 1, due: 0, seen: true } } as never);
    expect(ctx.kind).toBe('deck');
    expect(ctx.words).toEqual([{ sv: first.sv, en: first.en }]);
    expect(ctx.summary).not.toContain(`${first.sv} (`);
  });

  it('includes a region’s rules', () => {
    const ctx = buildContext('region:verb', {});
    expect(ctx.kind).toBe('region');
    expect(ctx.summary).toContain('Verb groups I–IV');
  });

  it('falls back to all words', () => {
    expect(buildContext(null, {}).kind).toBe('all');
  });
});

describe('RichText', () => {
  it('renders paragraphs, lists and bold', () => {
    render(<RichText text={'Hej **du**!\n\n- ett\n- två'} />);
    expect(screen.getByText('du').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
