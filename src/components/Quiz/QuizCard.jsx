import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, ProgressBar } from 'react-bootstrap';
import ContributorCard, { Avatar } from '../Contributor/ContributorCard';
import { shuffleArray } from '../../helpers/shuffleArray';

export const ROUND_SECONDS = 120;
export const QUESTIONS_PER_ROUND = 10;
export const FEEDBACK_MS = 1200;

const resultMessage = (percent) => {
  if (percent === 100) return 'Purr-fect! 🏆';
  if (percent >= 80) return 'Excellent work! 🌟';
  if (percent >= 50) return 'Good job, keep practicing! 💪';
  return 'Every cat starts as a kitten. Try again! 🐾';
};

/**
 * Timed multiple-choice quiz. Each question shows the student who wrote it.
 * questions: [{ question, options, answer, contributor }]
 */
const QuizCard = ({
  title,
  description,
  questions,
  questionsPerRound = QUESTIONS_PER_ROUND,
  roundSeconds = ROUND_SECONDS,
}) => {
  const [phase, setPhase] = useState('intro'); // intro | playing | finished
  const [round, setRound] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [selected, setSelected] = useState(null);
  const advanceTimer = useRef(null);

  const contributorCount = useMemo(
    () => new Set(questions.map((q) => q.contributor?.code || q.contributor?.name)).size,
    [questions],
  );

  const start = () => {
    clearTimeout(advanceTimer.current);
    setRound(shuffleArray(questions).slice(0, questionsPerRound).map((q) => ({
      ...q,
      options: shuffleArray(q.options),
    })));
    setIndex(0);
    setScore(0);
    setSelected(null);
    setTimeLeft(roundSeconds);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (timeLeft <= 0) {
      setPhase('finished');
      return undefined;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const current = round[index];

  const answer = (option) => {
    if (selected || !current) return;
    setSelected(option);
    if (option === current.answer) setScore((s) => s + 1);
    advanceTimer.current = setTimeout(() => {
      setSelected(null);
      if (index + 1 < round.length) setIndex((i) => i + 1);
      else setPhase('finished');
    }, FEEDBACK_MS);
  };

  const optionVariant = (option) => {
    if (!selected) return 'outline-primary';
    if (option === current.answer) return 'success';
    if (option === selected) return 'danger';
    return 'outline-secondary';
  };

  if (phase === 'intro') {
    return (
      <Card className="michi-card mx-auto text-center" style={{ maxWidth: 720 }}>
        <Card.Body className="p-4 p-md-5">
          <h1 className="h2 fw-bold">{title}</h1>
          {description && <p className="lead text-muted">{description}</p>}
          <div className="d-flex justify-content-center gap-2 flex-wrap mb-4">
            <Badge bg="light" text="dark" className="border">📝 {questions.length} questions</Badge>
            <Badge bg="light" text="dark" className="border">🧑‍🎓 {contributorCount} contributors</Badge>
            <Badge bg="light" text="dark" className="border">⏱️ {roundSeconds}s per round</Badge>
          </div>
          <p className="small text-muted">
            Each round picks {Math.min(questionsPerRound, questions.length)} random questions written by
            students. You will see who wrote each one!
          </p>
          <Button size="lg" onClick={start}>Start quiz</Button>
        </Card.Body>
      </Card>
    );
  }

  if (phase === 'finished') {
    const answered = round.length;
    const percent = answered ? Math.round((score / answered) * 100) : 0;
    const authors = [...new Map(round.map((q) => [q.contributor?.code || q.contributor?.name, q.contributor])).values()]
      .filter(Boolean);

    return (
      <Card className="michi-card mx-auto text-center" style={{ maxWidth: 720 }}>
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold">Quiz finished!</h2>
          <p className="display-5 fw-bold mb-0" data-testid="final-score">{score} / {answered}</p>
          <p className="lead">{resultMessage(percent)}</p>
          <h3 className="h6 text-muted mt-4">Questions in this round were written by</h3>
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

  return (
    <Card className="michi-card mx-auto" style={{ maxWidth: 820 }}>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-2 small">
          <span className="fw-semibold">Question {index + 1} of {round.length}</span>
          <span>
            <Badge bg="success" className="me-2">Score {score}</Badge>
            <Badge bg={timeLeft <= 15 ? 'danger' : 'secondary'} aria-live="polite">⏱️ {timeLeft}s</Badge>
          </span>
        </div>
        <ProgressBar now={((index + (selected ? 1 : 0)) / round.length) * 100} className="mb-4" style={{ height: 8 }} />

        <h2 className="h4 mb-4">{current.question}</h2>

        <div className="d-grid gap-2 mb-4" role="group" aria-label="Answer options">
          {current.options.map((option) => (
            <Button
              key={option}
              className="quiz-option"
              variant={optionVariant(option)}
              disabled={Boolean(selected)}
              onClick={() => answer(option)}
            >
              {option}
            </Button>
          ))}
        </div>

        {selected && (
          <p className={`fw-semibold ${selected === current.answer ? 'text-success' : 'text-danger'}`} role="status">
            {selected === current.answer ? '✅ Correct!' : `❌ The correct answer is "${current.answer}"`}
          </p>
        )}

        <hr />
        <ContributorCard contributor={current.contributor} label="Question by" />
      </Card.Body>
    </Card>
  );
};

export default QuizCard;
