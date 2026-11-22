// Plays the REAL content of public/ in the real components: every topic
// loads with all its students, and a player who knows the answers can win a
// full round of every quiz and game. New content is covered automatically.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { createAppStore } from '../../store/store';
import QuizCard, { FEEDBACK_MS } from '../../components/Quiz/QuizCard';
import RoundGame from '../../components/Games/RoundGame';
import SentenceBuilderItem from '../../components/Games/SentenceBuilderItem';
import ErrorHunterItem from '../../components/Games/ErrorHunterItem';
import { QUIZ_TOPICS } from '../../config/topics';
import { getContentType } from '../../config/contentTypes';
import { extractItemsWithContributor } from '../../helpers/contributors';
import { errorTokenIndexes, tokenize } from '../../games/sentenceTools';
import { buildContentIndexes } from '../../validation/contentIndex';
import { PUBLIC_DIR, listSubfolders, listVocabularyCategories, readJson } from '../../validation/contentFiles';

// Serves public/ (and the generated index.json files) like the dev server does.
const indexes = buildContentIndexes();
const serveFromDisk = async (url) => {
  const key = decodeURIComponent(String(url).replace(/^.*?michinglishapp\//, ''));
  const file = path.join(PUBLIC_DIR, key);
  const body = indexes[key] ?? (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined);
  return body === undefined ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => body };
};

const readTopic = (topic) =>
  listSubfolders(path.join(PUBLIC_DIR, topic.folder))
    .map((code) => ({ ...readJson(path.join(PUBLIC_DIR, topic.folder, code, 'info.json')).data, studentCode: code }))
    .filter((e) => e.user);

const plural = (n, word) => `${n} ${n === 1 ? word.replace(/s$/, '') : word}`;

const renderAt = (route) =>
  render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>
    </Provider>,
  );

beforeAll(() => vi.stubGlobal('fetch', vi.fn(serveFromDisk)));
afterAll(() => vi.unstubAllGlobals());

describe('every topic page loads all its real content', () => {
  test.each(QUIZ_TOPICS.map((t) => [t.path, t]))('/%s', async (_p, topic) => {
    const { itemName, listItems } = getContentType(topic.type);
    const total = readTopic(topic).reduce((n, entry) => n + listItems(entry).length, 0);
    expect(total, `public/${topic.folder} has no content yet`).toBeGreaterThan(0);
    renderAt(`/${topic.path}`);
    expect(await screen.findByText(new RegExp(`${plural(total, itemName)}\\b`), {}, { timeout: 3000 })).toBeInTheDocument();
  });

  test.each(listVocabularyCategories().map((c) => [c]))('/vocabularypuzzel/%s', async (category) => {
    renderAt(`/vocabularypuzzel/${category}`);
    expect(await screen.findByText('Puzzle by', {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe('a player who knows the answers wins every round', () => {
  afterEach(() => vi.useRealTimers());

  const quizTopics = QUIZ_TOPICS.filter((t) => t.type === 'quiz');
  test.each(quizTopics.map((t) => [t.folder, t]))('quiz: %s', (_f, topic) => {
    vi.useFakeTimers();
    const questions = extractItemsWithContributor(readTopic(topic), 'quiz');
    render(<QuizCard title={topic.title} questions={questions} questionsPerRound={questions.length} roundSeconds={100000} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start quiz' }));

    for (let i = 0; i < questions.length; i += 1) {
      const text = screen.getByRole('heading', { level: 2 }).textContent;
      const shown = within(screen.getByRole('group', { name: 'Answer options' })).getAllByRole('button');
      const shownTexts = shown.map((b) => b.textContent);
      // Questions with the same text but different options are told apart by their options.
      const match = questions.find((q) => q.question === text && q.options.every((o) => shownTexts.includes(o)));
      fireEvent.click(shown[shownTexts.indexOf(match.answer)]);
      act(() => vi.advanceTimersByTime(FEEDBACK_MS));
    }
    expect(screen.getByTestId('final-score')).toHaveTextContent(`${questions.length} / ${questions.length}`);
  });

  const playSentenceBuilder = (item) => {
    const pool = screen.getByRole('group', { name: 'Available words' });
    tokenize(item.sentence).forEach((word) => {
      fireEvent.click(within(pool).getAllByRole('button').find((b) => b.textContent === word));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  };
  const playErrorHunter = (item) => {
    const [first] = errorTokenIndexes(item.sentence, item.wrong);
    fireEvent.click(within(screen.getByRole('group', { name: 'Sentence words' })).getAllByRole('button')[first]);
  };

  test.each([
    ['sentencebuilder', SentenceBuilderItem, playSentenceBuilder, (i) => i.sentence],
    ['errorhunter', ErrorHunterItem, playErrorHunter, (i) => i.sentence],
  ])('game: %s', (folder, Item, play) => {
    const topic = QUIZ_TOPICS.find((t) => t.folder === folder);
    const items = extractItemsWithContributor(readTopic(topic), topic.type);
    // The item on screen is identified by the sentence the player sees.
    let current = null;
    render(
      <RoundGame
        title={topic.title}
        items={items}
        itemsPerRound={items.length}
        renderItem={({ item, onDone }) => {
          current = item;
          return <Item item={item} onDone={onDone} />;
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    for (let i = 0; i < items.length; i += 1) {
      play(current);
      expect(screen.getByRole('status')).toHaveTextContent('✅');
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByTestId('final-score')).toHaveTextContent(`${items.length} / ${items.length}`);
  });
});
