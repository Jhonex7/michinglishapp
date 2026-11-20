import { useMemo, useState } from 'react';
import { Badge, Button, Card, ProgressBar } from 'react-bootstrap';
import ContributorCard, { Avatar } from '../Contributor/ContributorCard';
import { shuffleArray } from '../../helpers/shuffleArray';

export const ITEMS_PER_ROUND = 10;

const count = (n, plural) => `${n} ${n === 1 ? plural.replace(/s$/, '') : plural}`;

const resultMessage = (percent) => {
  if (percent === 100) return 'Purr-fect! 🏆';
  if (percent >= 80) return 'Excellent work! 🌟';
  if (percent >= 50) return 'Good job, keep practicing! 💪';
  return 'Every cat starts as a kitten. Try again! 🐾';
};

/**
 * Shared frame for item-by-item games (Sentence Builder, Error Hunter…):
 * intro screen, random round, progress, score, author of each item and a
 * final summary.
 *
 * items:      [{ ...itemData, contributor }]
 * renderItem: ({ item, onDone }) => element. The game calls onDone(isCorrect)
 *             when the player moves to the next item.
 */
const RoundGame = ({ title, description, instructions, items, itemName = 'items', renderItem, itemsPerRound = ITEMS_PER_ROUND }) => {
  const [phase, setPhase] = useState('intro'); // intro | playing | finished
  const [round, setRound] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const contributorCount = useMemo(
    () => new Set(items.map((i) => i.contributor?.code || i.contributor?.name)).size,
    [items],
  );

  const start = () => {
    setRound(shuffleArray(items).slice(0, itemsPerRound));
    setIndex(0);
    setScore(0);
    setPhase('playing');
  };

  const onDone = (isCorrect) => {
    if (isCorrect) setScore((s) => s + 1);
    if (index + 1 < round.length) setIndex((i) => i + 1);
    else setPhase('finished');
  };

  if (phase === 'intro') {
    return (
      <Card className="michi-card mx-auto text-center" style={{ maxWidth: 720 }}>
        <Card.Body className="p-4 p-md-5">
          <h1 className="h2 fw-bold">{title}</h1>
          {description && <p className="lead text-muted">{description}</p>}
          <div className="d-flex justify-content-center gap-2 flex-wrap mb-3">
            <Badge bg="light" text="dark" className="border">📝 {count(items.length, itemName)}</Badge>
            <Badge bg="light" text="dark" className="border">🧑‍🎓 {count(contributorCount, 'contributors')}</Badge>
          </div>
          {instructions && <p className="small text-muted">{instructions}</p>}
          <Button size="lg" onClick={start}>Start</Button>
        </Card.Body>
      </Card>
    );
  }

  if (phase === 'finished') {
    const percent = round.length ? Math.round((score / round.length) * 100) : 0;
    const authors = [...new Map(round.map((i) => [i.contributor?.code || i.contributor?.name, i.contributor])).values()]
      .filter(Boolean);
    return (
      <Card className="michi-card mx-auto text-center" style={{ maxWidth: 720 }}>
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold">Round finished!</h2>
          <p className="display-5 fw-bold mb-0" data-testid="final-score">{score} / {round.length}</p>
          <p className="lead">{resultMessage(percent)}</p>
          <h3 className="h6 text-muted mt-4">This round was written by</h3>
          <div className="d-flex flex-wrap justify-content-center gap-3 my-3">
            {authors.map((author) => (
              <div key={author.code || author.name} className="d-flex align-items-center gap-2 small">
                <Avatar contributor={author} size={32} />
                <span>{author.name}</span>
              </div>
            ))}
          </div>
          <Button size="lg" onClick={start}>Play again</Button>
        </Card.Body>
      </Card>
    );
  }

  const item = round[index];
  return (
    <Card className="michi-card mx-auto" style={{ maxWidth: 820 }}>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-2 small">
          <span className="fw-semibold">{title} · {index + 1} of {round.length}</span>
          <Badge bg="success">Score {score}</Badge>
        </div>
        <ProgressBar now={(index / round.length) * 100} className="mb-4" style={{ height: 8 }} />

        {/* key resets the game state for every new item */}
        <div key={index}>{renderItem({ item, onDone })}</div>

        <hr />
        <ContributorCard contributor={item.contributor} label="Written by" />
      </Card.Body>
    </Card>
  );
};

export default RoundGame;
