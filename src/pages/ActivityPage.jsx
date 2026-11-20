import { useMemo } from 'react';
import { Alert, Container, Spinner } from 'react-bootstrap';
import QuizCard from '../components/Quiz/QuizCard';
import RoundGame from '../components/Games/RoundGame';
import SentenceBuilderItem from '../components/Games/SentenceBuilderItem';
import ErrorHunterItem from '../components/Games/ErrorHunterItem';
import { useTopic } from '../hooks/useContent';
import { extractItemsWithContributor } from '../helpers/contributors';

// Which component plays each content type (see src/config/contentTypes.js).
const GAMES = {
  'sentence-builder': {
    itemName: 'sentences',
    instructions: 'Tap the words in the right order. Tap a word again to remove it.',
    Item: SentenceBuilderItem,
  },
  'error-hunter': {
    itemName: 'sentences',
    instructions: 'Each sentence has exactly one mistake. Tap it to see the correction.',
    Item: ErrorHunterItem,
  },
};

const ActivityPage = ({ topic }) => {
  const { entries, status, error } = useTopic(topic.id);
  const items = useMemo(() => extractItemsWithContributor(entries, topic.type), [entries, topic.type]);
  const title = `${topic.emoji} ${topic.title}`;
  const game = GAMES[topic.type];

  return (
    <Container className="py-4">
      {status === 'failed' && <Alert variant="danger">Could not load {topic.title}: {error}</Alert>}
      {(status === 'loading' || status === 'idle') && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      )}
      {status === 'succeeded' && items.length === 0 && (
        <Alert variant="info">Nothing here yet for {topic.title}. Be the first to contribute! 🐾</Alert>
      )}
      {status === 'succeeded' && items.length > 0 && (game ? (
        <RoundGame
          key={topic.id}
          title={title}
          description={topic.description}
          instructions={game.instructions}
          itemName={game.itemName}
          items={items}
          renderItem={({ item, onDone }) => <game.Item item={item} onDone={onDone} />}
        />
      ) : (
        <QuizCard key={topic.id} title={title} description={topic.description} questions={items} />
      ))}
    </Container>
  );
};

export default ActivityPage;
