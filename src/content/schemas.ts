import { z } from 'zod';

export const Level = z.enum(['A1', 'A2', 'B1']);
export type Level = z.infer<typeof Level>;

/** A small joke, pun or funny situation using the word or rule. Shown only behind an ⓘ button. */
export const Fun = z.object({
  sv: z.string().min(1),
  en: z.string().min(1),
  /** Explains the pun or the joke, in English. */
  note: z.string().optional(),
});
export type Fun = z.infer<typeof Fun>;

/** Fields every content record may carry. */
const recordBase = {
  id: z.string().min(1),
  level: Level,
  lesson: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  /** Retired content stops appearing but keeps old progress valid. */
  retired: z.boolean().optional(),
  /** Drafts are hidden in the app until completed. */
  draft: z.boolean().optional(),
  /** Unconfirmed forms; never shipped to the default decks. */
  check: z.boolean().optional(),
};

const itemBase = {
  ...recordBase,
  /** Short English instruction shown above the prompt (e.g. “Pick the plural”). */
  ask: z.string().optional(),
  hint: z.string().optional(),
  explain: z.string().optional(),
  /** Full correct Swedish, spoken and shown after answering. */
  say: z.string().optional(),
  /** Boss-only item (harder: typed or order). Excluded from practice rounds and mastery. */
  boss: z.boolean().optional(),
  /** Language of the prompt text; English prompts (word decks) are shown in the body font. Default sv. */
  promptLang: z.enum(['sv', 'en']).optional(),
  fun: Fun.optional(),
};

export const ChoiceItem = z.object({
  ...itemBase,
  kind: z.literal('choice'),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
});

export const HousesItem = z.object({
  ...itemBase,
  kind: z.literal('houses'),
  prompt: z.string().min(1),
  answer: z.number().int().min(1).max(5),
});

export const TypeItem = z.object({
  ...itemBase,
  kind: z.literal('type'),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  accept: z.array(z.string()).default([]),
});

export const OrderItem = z.object({
  ...itemBase,
  kind: z.literal('order'),
  sentence: z.string().min(1),
  accept: z.array(z.string()).default([]),
  en: z.string().min(1),
});

export const MatchItem = z.object({
  ...itemBase,
  kind: z.literal('match'),
  pairs: z.array(z.tuple([z.string(), z.string()])).min(4).max(6),
});

export const ListenItem = z.object({
  ...itemBase,
  kind: z.literal('listen'),
  audio: z.string().optional(),
  prompt: z.string().optional(),
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4).optional(),
  accept: z.array(z.string()).default([]),
});

export const ClozeGap = z.object({
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4).optional(),
  accept: z.array(z.string()).default([]),
});

export const ClozeItem = z.object({
  ...itemBase,
  kind: z.literal('cloze'),
  text: z.string().min(1),
  gaps: z.array(ClozeGap).min(1),
});

export const Item = z
  .discriminatedUnion('kind', [ChoiceItem, HousesItem, TypeItem, OrderItem, MatchItem, ListenItem, ClozeItem])
  .superRefine((item, ctx) => {
    if (item.kind === 'listen' && !item.audio && !item.say) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'listen items need audio or say' });
    }
  });
export type Item = z.infer<typeof Item>;
export type ItemKind = Item['kind'];
export type ChoiceItem = z.infer<typeof ChoiceItem>;
export type HousesItem = z.infer<typeof HousesItem>;
export type TypeItem = z.infer<typeof TypeItem>;
export type OrderItem = z.infer<typeof OrderItem>;

export const ItemsFile = z.array(z.unknown());

/** [Swedish, English] or [Swedish, Swedish, English]. */
export const RuleExample = z.array(z.string().min(1)).min(2).max(3);

export const RuleCard = z.object({
  title: z.string().min(1),
  rule: z.string().min(1),
  examples: z.array(RuleExample).min(2, 'every rule card needs at least two examples'),
  watch: z.string().optional(),
  fun: Fun.optional(),
});
export type RuleCard = z.infer<typeof RuleCard>;

export const GeneratorName = z.enum(['nouns', 'verbs-present', 'verbs-past', 'verbs-perfect', 'adjectives', 'days', 'numbers']);
export type GeneratorName = z.infer<typeof GeneratorName>;

export const ColourToken = z.enum(['falu', 'ochre', 'lake', 'moss', 'lupin']);

export const Region = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().min(1),
  lessons: z.array(z.number().int().positive()).min(1),
  colour: ColourToken,
  order: z.number().int(),
  generators: z.array(GeneratorName).default([]),
  ruleCards: z.array(RuleCard).min(1),
  /** Lesson number at which the region unlocks (for A2 regions added later). */
  unlockLesson: z.number().int().positive().optional(),
});
export type Region = z.infer<typeof Region>;

export const Gender = z.enum(['en', 'ett']);
export type Gender = z.infer<typeof Gender>;

export const Noun = z.object({
  ...recordBase,
  sv: z.string().min(1),
  gender: Gender,
  def: z.string().min(1),
  pl: z.string().min(1),
  defPl: z.string().min(1),
  en: z.string().min(1),
  /** English plural when it isn’t just en + s. */
  enPl: z.string().optional(),
  group: z.number().int().min(1).max(5),
  note: z.string().optional(),
  defPlNote: z.string().optional(),
  fun: Fun.optional(),
  /** Skips the group/definite-plural agreement checks for listed irregulars. */
  irregular: z.boolean().optional(),
});
export type Noun = z.infer<typeof Noun>;

export const NounGroup = z.object({ ending: z.string(), label: z.string(), rule: z.string() });
export type NounGroup = z.infer<typeof NounGroup>;

export const NounTable = z.object({
  groups: z.object({ '1': NounGroup, '2': NounGroup, '3': NounGroup, '4': NounGroup, '5': NounGroup }),
  /** Explanation templates with {placeholders}, keyed by item type. */
  explain: z.record(z.string(), z.string()),
  /** Lesson in which each item type was taught (overrides the row’s lesson). */
  lessons: z.record(z.string(), z.number().int().positive()).optional(),
  /** Spoken/feedback Swedish templates, keyed by item type. */
  say: z.record(z.string(), z.string()),
  nouns: z.array(z.unknown()),
});
export type NounTable = Omit<z.infer<typeof NounTable>, 'nouns'> & { nouns: Noun[] };

export const VocabEntry = z
  .object({
    ...recordBase,
    sv: z.string().min(1),
    en: z.string().min(1),
    enPl: z.string().optional(),
    pos: z.enum(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other']),
    gender: Gender.optional(),
    countable: z.boolean().optional(),
    forms: z
      .object({ def: z.string().optional(), pl: z.string().optional(), defPl: z.string().optional() })
      .optional(),
    group: z.number().int().min(1).max(5).optional(),
    /** Listed irregular noun: skips the group / definite-plural agreement checks. */
    irregular: z.boolean().optional(),
    example: z.object({ sv: z.string(), en: z.string() }).optional(),
    note: z.string().optional(),
    /** Phrase-bank function tag, e.g. "greeting", "opinion", "complaint". */
    function: z.string().optional(),
    fun: Fun.optional(),
  })
  .superRefine((e, ctx) => {
    if (e.pos !== 'noun' || e.draft) return;
    if (!e.gender) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${e.sv}: nouns need gender` });
    if (e.countable !== false && !(e.forms?.def && e.forms.pl && e.forms.defPl && e.group)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${e.sv}: countable nouns need forms (def, pl, defPl) and group` });
    }
  });
export type VocabEntry = z.infer<typeof VocabEntry>;

export const VocabFile = z.object({
  theme: z.string().min(1),
  title: z.string().min(1),
  entries: z.array(z.unknown()),
});

export const ContentVersion = z.object({ version: z.number().int().nonnegative() });

export const UiStrings = z.object({
  feedback: z.object({ correct: z.string(), wrong: z.string(), almost: z.string(), diacritics: z.string() }),
  letters: z.array(z.string()),
});
export type UiStrings = z.infer<typeof UiStrings>;

export const KnownForms = z.object({
  note: z.string().optional(),
  items: z.array(z.object({ id: z.string(), answer: z.union([z.string(), z.number()]) })),
});

const Frame = z.object({ sv: z.string().min(1), en: z.string().min(1) });
export type Frame = z.infer<typeof Frame>;

export const Verb = z.object({
  ...recordBase,
  inf: z.string().min(1),
  pres: z.string().min(1),
  imp: z.string().min(1),
  past: z.string().min(1),
  sup: z.string().min(1),
  /** Accepted alternatives: sa/sade, gett/givit. */
  also: z.object({ past: z.array(z.string()).default([]), sup: z.array(z.string()).default([]) }).default({}),
  group: z.number().int().min(1).max(4),
  en: z.string().min(1),
  en3: z.string().min(1),
  enPast: z.string().min(1),
  enPp: z.string().min(1),
  /** Phrase after the verb in sentence frames; null keeps the verb out of frames. */
  object: z.string().nullable(),
  objectEn: z.string().optional(),
  /** Past-tense time marker when “Igår” reads oddly (Förra året bodde jag …). */
  time: z.string().optional(),
  timeEn: z.string().optional(),
  /** Skip the help-verb frame when it reads oddly (Du måste glömma …). */
  noHelp: z.boolean().optional(),
  fun: Fun.optional(),
  note: z.string().optional(),
});
export type Verb = z.infer<typeof Verb>;

export const VerbTable = z.object({
  groups: z.record(z.string(), z.object({ label: z.string(), rule: z.string() })),
  frames: z.object({
    help: z.array(Frame).min(1),
    present: z.array(Frame).min(1),
    past: z.array(Frame).min(1),
    perfect: z.array(Frame).min(1),
    bare: z.object({ sv: z.string() }),
  }),
  defaultTime: Frame,
  explain: z.record(z.string(), z.string()),
  /** Lesson in which each item type was taught (overrides the row’s lesson). */
  lessons: z.record(z.string(), z.number().int().positive()).optional(),
  verbs: z.array(z.unknown()),
});
export type VerbTable = Omit<z.infer<typeof VerbTable>, 'verbs'> & { verbs: Verb[] };

export const Adjective = z.object({
  ...recordBase,
  base: z.string().min(1),
  t: z.string().min(1),
  a: z.string().min(1),
  def: z.string().min(1),
  comp: z.string().nullable(),
  sup: z.string().nullable(),
  en: z.string().min(1),
  enComp: z.string().optional(),
  enSup: z.string().optional(),
  enNoun: z.string().min(1),
  enNounEn: z.string().min(1),
  ettNoun: z.string().min(1),
  ettNounEn: z.string().min(1),
  plNoun: z.string().min(1),
  plNounEn: z.string().min(1),
  defNoun: z.string().min(1),
  defNounEn: z.string().min(1),
  compFrame: Frame.optional(),
  supFrame: Frame.optional(),
  fun: Fun.optional(),
  irregular: z.boolean().optional(),
  note: z.string().optional(),
});
export type Adjective = z.infer<typeof Adjective>;

export const AdjectiveTable = z.object({
  frames: z.object({ en: Frame, ett: Frame, pl: Frame, def: Frame, comp: Frame, sup: Frame }),
  explain: z.record(z.string(), z.string()),
  /** Lesson in which each item type was taught (overrides the row’s lesson). */
  lessons: z.record(z.string(), z.number().int().positive()).optional(),
  adjectives: z.array(z.unknown()),
});
export type AdjectiveTable = Omit<z.infer<typeof AdjectiveTable>, 'adjectives'> & { adjectives: Adjective[] };

export const DayKind = z.enum(['next', 'habit', 'last']);
export type DayKind = z.infer<typeof DayKind>;

export const DaysTable = z.object({
  days: z.array(z.object({ sv: z.string(), en: z.string() })).min(2),
  forms: z.object({ next: z.string(), habit: z.string(), last: z.string() }),
  frames: z.object({ next: z.array(Frame).min(1), habit: z.array(Frame).min(1), last: z.array(Frame).min(1) }),
  explain: z.object({ next: z.string(), habit: z.string(), last: z.string() }),
  level: Level,
  lesson: z.number().int().positive().optional(),
});
export type DaysTable = z.infer<typeof DaysTable>;

export const NumbersTable = z.object({
  words: z.record(z.string(), z.string()),
  hundred: z.string(),
  thousand: z.string(),
  practice: z.array(z.number().int().min(0).max(1000)),
  explain: z.record(z.string(), z.string()),
  level: Level,
  lesson: z.number().int().positive().optional(),
});
export type NumbersTable = z.infer<typeof NumbersTable>;
