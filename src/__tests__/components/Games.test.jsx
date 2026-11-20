import { describe, expect, test } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RoundGame from '../../components/Games/RoundGame';
import SentenceBuilderItem from '../../components/Games/SentenceBuilderItem';
import ErrorHunterItem from '../../components/Games/ErrorHunterItem';
import { toContributor } from '../../helpers/contributors';

const ana = toContributor({ username: 'Ana', socialNetwork: 'tiktok', socialLink: '@ana' }, '2212345-3743');

const renderGame = (Item, items) =>
  render(
    <RoundGame
      title="Game"
      items={items.map((item) => ({ ...item, contributor: ana }))}
      itemName="sentences"
      renderItem={({ item, onDone }) => <Item item={item} onDone={onDone} />}
    />,
  );

const start = () => fireEvent.click(screen.getByRole('button', { name: 'Start' }));
const group = (name) => within(screen.getByRole('group', { name }));

describe('Sentence Builder', () => {
  const sentence = 'I like green apples.';

  const pickInOrder = (words) =>
    words.forEach((word) => fireEvent.click(group('Available words').getByRole('button', { name: word })));

  test('building the sentence in order scores a point and credits the author', () => {
    renderGame(SentenceBuilderItem, [{ sentence, hint: 'Present simple' }]);
    start();

    expect(screen.getByText(/Present simple/)).toBeInTheDocument();
    expect(within(screen.getByTestId('contributor-card')).getByText('2212345-3743')).toBeInTheDocument();

    const check = screen.getByRole('button', { name: 'Check' });
    expect(check).toBeDisabled();
    pickInOrder(['I', 'like', 'green', 'apples.']);
    fireEvent.click(check);

    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('final-score')).toHaveTextContent('1 / 1');
  });

  test('a wrong order shows the correct sentence', () => {
    renderGame(SentenceBuilderItem, [{ sentence }]);
    start();
    pickInOrder(['like', 'I', 'green', 'apples.']);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByRole('status')).toHaveTextContent(`The correct sentence is: “${sentence}”`);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('final-score')).toHaveTextContent('0 / 1');
  });

  test('tapping a chosen word sends it back, and Clear resets', () => {
    renderGame(SentenceBuilderItem, [{ sentence }]);
    start();
    pickInOrder(['green', 'I']);
    fireEvent.click(group('Your sentence').getByRole('button', { name: 'green' }));
    expect(group('Available words').getByRole('button', { name: 'green' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(group('Available words').getAllByRole('button')).toHaveLength(4);
  });
});

describe('Error Hunter', () => {
  const item = {
    sentence: 'If I will see him, I will tell him.',
    wrong: 'will see',
    correct: 'see',
    explanation: 'Present simple in the if-clause.',
  };

  test('tapping the mistake scores and shows the corrected sentence', () => {
    renderGame(ErrorHunterItem, [item]);
    start();
    // "see" is part of the two-word mistake "will see".
    fireEvent.click(group('Sentence words').getByRole('button', { name: 'see' }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('You found it');
    expect(status).toHaveTextContent('Correct: If I see him, I will tell him.');
    expect(status).toHaveTextContent('Present simple in the if-clause.');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('final-score')).toHaveTextContent('1 / 1');
  });

  test('tapping another word reveals the mistake and gives no point', () => {
    renderGame(ErrorHunterItem, [item]);
    start();
    fireEvent.click(group('Sentence words').getByRole('button', { name: 'tell' }));

    expect(screen.getByRole('status')).toHaveTextContent('The mistake was “will see”');
    group('Sentence words').getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('final-score')).toHaveTextContent('0 / 1');
  });
});

test('RoundGame plays every item of a short round and allows playing again', () => {
  renderGame(ErrorHunterItem, [
    { sentence: 'She go home.', wrong: 'go', correct: 'goes', explanation: 'x' },
    { sentence: 'They is late.', wrong: 'is', correct: 'are', explanation: 'y' },
  ]);
  expect(screen.getByText(/2 sentences/)).toBeInTheDocument();
  start();
  expect(screen.getByText('Game · 1 of 2')).toBeInTheDocument();
  fireEvent.click(group('Sentence words').getAllByRole('button')[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Game · 2 of 2')).toBeInTheDocument();
  fireEvent.click(group('Sentence words').getAllByRole('button')[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Round finished!')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  expect(screen.getByText('Game · 1 of 2')).toBeInTheDocument();
});
