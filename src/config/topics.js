// Single source of truth for every quiz topic in the app.
//
// To add a new quiz topic:
//   1. Create `public/<folder>/index.json` with `{ "folders": [] }`.
//   2. Add one entry to QUIZ_TOPICS below.
// Routes, sidebar, home page, data loading and tests pick it up automatically.

export const TOPIC_GROUPS = [
  { id: 'general', title: 'General English' },
  { id: 'words', title: 'Words & Grammar' },
  { id: 'modals', title: 'Modal Verbs' },
  { id: 'conditionals', title: 'Conditionals' },
];

export const QUIZ_TOPICS = [
  {
    id: 'data',
    folder: 'data',
    path: 'testknowledge',
    title: 'Check Your Knowledge',
    emoji: '🎯',
    group: 'general',
    level: 'A2–B2',
    description: 'A mixed challenge with questions from every classmate.',
  },
  {
    id: 'verbs',
    folder: 'verbs',
    path: 'verbs',
    title: 'Verbs',
    emoji: '🏃',
    group: 'words',
    level: 'A2',
    description: 'Tenses, forms and verb patterns.',
  },
  {
    id: 'adjectives',
    folder: 'adjectives',
    path: 'adjectives',
    title: 'Adjectives',
    emoji: '🎨',
    group: 'words',
    level: 'A2',
    description: 'Describe people, places and things.',
  },
  {
    id: 'adverbs',
    folder: 'adverbs',
    path: 'adverbs',
    title: 'Adverbs',
    emoji: '⚡',
    group: 'words',
    level: 'B1',
    description: 'How, when, where and how often.',
  },
  {
    id: 'linkwords',
    folder: 'linkwords',
    path: 'linking-words',
    title: 'Linking Words',
    emoji: '🔗',
    group: 'words',
    level: 'B1',
    description: 'Connect ideas: however, although, therefore…',
  },
  {
    id: 'modalspossibility',
    folder: 'modalspossibility',
    path: 'modals-of-possibility',
    title: 'Modals of Possibility',
    emoji: '🤔',
    group: 'modals',
    level: 'B1',
    description: 'May, might, could: talk about what is possible.',
  },
  {
    id: 'modalsdeduction',
    folder: 'modalsdeduction',
    path: 'modals-of-deduction',
    title: 'Modals of Deduction',
    emoji: '🕵️',
    group: 'modals',
    level: 'B2',
    description: 'Must, can’t, might have: make logical guesses.',
  },
  {
    id: 'zeroconditional',
    folder: 'zeroconditional',
    path: 'zero-conditionals',
    title: 'Zero Conditional',
    emoji: '0️⃣',
    group: 'conditionals',
    level: 'A2',
    description: 'General truths: if you heat ice, it melts.',
  },
  {
    id: 'firstconditional',
    folder: 'firstconditional',
    path: 'first-conditionals',
    title: 'First Conditional',
    emoji: '1️⃣',
    group: 'conditionals',
    level: 'B1',
    description: 'Real future situations: if it rains, I will stay home.',
  },
  {
    id: 'secondconditional',
    folder: 'secondconditional',
    path: 'second-conditionals',
    title: 'Second Conditional',
    emoji: '2️⃣',
    group: 'conditionals',
    level: 'B1',
    description: 'Imaginary present: if I had wings, I would fly.',
  },
  {
    id: 'thirdconditional',
    folder: 'thirdconditional',
    path: 'third-conditionals',
    title: 'Third Conditional',
    emoji: '3️⃣',
    group: 'conditionals',
    level: 'B2',
    description: 'Past regrets: if I had studied, I would have passed.',
  },
  {
    id: 'mixedconditional',
    folder: 'mixedconditional',
    path: 'mixed_conditionals',
    title: 'Mixed Conditional',
    emoji: '🔀',
    group: 'conditionals',
    level: 'B2',
    description: 'Mix past and present: if I had slept, I wouldn’t be tired.',
  },
];

export const getTopicById = (id) => QUIZ_TOPICS.find((topic) => topic.id === id);

export const formatCategoryName = (category) =>
  category.charAt(0).toUpperCase() + category.slice(1);
