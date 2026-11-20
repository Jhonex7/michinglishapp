import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import QuizCard, { FEEDBACK_MS } from '../../components/Quiz/QuizCard';
import { toContributor } from '../../helpers/contributors';

const ana = toContributor({ username: 'Ana', socialNetwork: 'tiktok', socialLink: '@ana' }, '2212345-3743');
const beto = toContributor({ username: 'Beto', socialNetwork: 'github', socialLink: '@beto' }, '1111111-1111');

const questions = [
  { question: 'She _____ every day.', options: ['run', 'runs', 'running', 'ran'], answer: 'runs', contributor: ana },
  { question: 'They _____ yesterday.', options: ['go', 'goes', 'went', 'gone'], answer: 'went', contributor: beto },
];

const start = () => fireEvent.click(screen.getByRole('button', { name: /start quiz/i }));
const currentQuestion = () => questions.find((q) => screen.queryByText(q.question));
const options = () => within(screen.getByRole('group', { name: /answer options/i }));

describe('QuizCard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('intro shows how many questions and contributors there are', () => {
    render(<QuizCard title="Verbs" questions={questions} />);
    expect(screen.getByText(/2 questions/)).toBeInTheDocument();
    expect(screen.getByText(/2 contributors/)).toBeInTheDocument();
  });

  test('each question credits its author with name, code and social handle', () => {
    render(<QuizCard title="Verbs" questions={questions} />);
    start();

    const q = currentQuestion();
    const card = screen.getByTestId('contributor-card');
    expect(within(card).getByText(q.contributor.name)).toBeInTheDocument();
    expect(within(card).getByText(q.contributor.code)).toBeInTheDocument();
    expect(within(card).getByText(`@${q.contributor.social.handle}`, { exact: false })).toBeInTheDocument();
  });

  test('marks the right answer, counts the score and finishes the round', () => {
    render(<QuizCard title="Verbs" questions={questions} />);
    start();

    // Answer the first question correctly.
    let q = currentQuestion();
    fireEvent.click(options().getByRole('button', { name: q.answer }));
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    act(() => vi.advanceTimersByTime(FEEDBACK_MS));

    // Answer the second one wrong.
    q = currentQuestion();
    const wrong = q.options.find((o) => o !== q.answer);
    fireEvent.click(options().getByRole('button', { name: wrong }));
    expect(screen.getByRole('status')).toHaveTextContent(`The correct answer is "${q.answer}"`);
    act(() => vi.advanceTimersByTime(FEEDBACK_MS));

    expect(screen.getByTestId('final-score')).toHaveTextContent('1 / 2');
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Beto')).toBeInTheDocument();
  });

  test('ignores extra clicks after answering', () => {
    render(<QuizCard title="Verbs" questions={questions} />);
    start();
    const q = currentQuestion();
    fireEvent.click(options().getByRole('button', { name: q.answer }));
    fireEvent.click(options().getByRole('button', { name: q.answer }));
    expect(screen.getByText('Score 1')).toBeInTheDocument();
  });

  test('ends the round when the time runs out', () => {
    render(<QuizCard title="Verbs" questions={questions} roundSeconds={3} />);
    start();
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/quiz finished/i)).toBeInTheDocument();
  });

  test('limits each round to questionsPerRound', () => {
    render(<QuizCard title="Verbs" questions={questions} questionsPerRound={1} />);
    start();
    expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
  });
});
