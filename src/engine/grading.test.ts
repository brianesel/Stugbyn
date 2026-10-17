import type { Item } from '../content/schemas';
import { editDistance, grade, gradeTyped, normalise } from './grading';

describe('normalise', () => {
  it('trims, collapses spaces, lowercases and strips final punctuation', () => {
    expect(normalise('  Jag   Bor i Åbo. ')).toBe('jag bor i åbo');
    expect(normalise('Var bor du?!')).toBe('var bor du');
  });
  it('never folds å, ä, ö', () => {
    expect(normalise('Läsa')).not.toBe(normalise('lasa'));
  });
});

describe('gradeTyped', () => {
  it('accepts the answer and accepted alternatives', () => {
    expect(gradeTyped('sade', ['sa', 'sade']).correct).toBe(true);
    expect(gradeTyped(' Gett ', ['gett', 'givit']).correct).toBe(true);
  });
  it('marks a missing diacritic wrong with a diacritics note', () => {
    expect(gradeTyped('lasa', ['läsa'])).toEqual({ correct: false, note: 'diacritics' });
    expect(gradeTyped('bocker', ['böcker'])).toEqual({ correct: false, note: 'diacritics' });
  });
  it('gives “Almost!” for a one-letter typo on words longer than 5 letters, still wrong', () => {
    expect(gradeTyped('telefonr', ['telefoner'])).toEqual({ correct: false, note: 'almost' });
    expect(gradeTyped('bilr', ['bilar'])).toEqual({ correct: false });
  });
  it('plain wrong answers get no note', () => {
    expect(gradeTyped('hund', ['katter'])).toEqual({ correct: false });
  });
});

describe('editDistance', () => {
  it('computes small distances', () => {
    expect(editDistance('katter', 'kattar')).toBe(1);
    expect(editDistance('abc', 'abc')).toBe(0);
    expect(editDistance('a', 'abcd', 1)).toBe(2);
  });
});

describe('grade', () => {
  const choice: Item = {
    id: 't:var',
    kind: 'choice',
    prompt: '___ bor du?',
    hint: 'Where do you live?',
    answer: 'Var',
    options: ['Var', 'Vart', 'Vad'],
    explain: 'Var = where.',
    level: 'A1',
  };
  it('grades choice by exact match and fills the gap in the expected sentence', () => {
    expect(grade(choice, 'Var')).toEqual({ correct: true, expected: 'Var bor du?', explain: 'Var = where.' });
    expect(grade(choice, 'Vart').correct).toBe(false);
  });
  it('prefers say for the expected text', () => {
    expect(grade({ ...choice, say: 'Var bor du någonstans?' }, 'Var').expected).toBe('Var bor du någonstans?');
  });
  it('grades houses by group number', () => {
    const houses: Item = { id: 'h', kind: 'houses', prompt: 'en bil', answer: 2, level: 'A1' };
    expect(grade(houses, 2).correct).toBe(true);
    expect(grade(houses, '2').correct).toBe(true);
    expect(grade(houses, 3).correct).toBe(false);
  });
  it('grades order by normalised tokens, including accepted orders', () => {
    const order: Item = {
      id: 'o',
      kind: 'order',
      sentence: 'Igår köpte hon en kaka.',
      accept: ['Hon köpte en kaka igår.'],
      en: 'Yesterday she bought a cake.',
      level: 'A1',
    };
    expect(grade(order, 'igår köpte hon en kaka').correct).toBe(true);
    expect(grade(order, 'Hon köpte en kaka igår').correct).toBe(true);
    expect(grade(order, 'Igår hon köpte en kaka').correct).toBe(false);
  });
});
