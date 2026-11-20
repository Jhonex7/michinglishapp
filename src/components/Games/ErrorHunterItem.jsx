import { useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { applyCorrection, errorTokenIndexes, tokenize } from '../../games/sentenceTools';

/**
 * One Error Hunter exercise: tap the word that is wrong.
 * item: { sentence, wrong, correct, explanation }
 */
const ErrorHunterItem = ({ item, onDone }) => {
  const tokens = useMemo(() => tokenize(item.sentence), [item.sentence]);
  const mistake = useMemo(() => errorTokenIndexes(item.sentence, item.wrong), [item]);
  const [selected, setSelected] = useState(null);

  const answered = selected !== null;
  const isCorrect = answered && mistake.has(selected);

  const variantFor = (i) => {
    if (!answered) return 'outline-primary';
    if (mistake.has(i)) return isCorrect ? 'success' : 'warning';
    if (i === selected) return 'danger';
    return 'outline-secondary';
  };

  return (
    <div>
      <h2 className="h5 mb-3">Tap the mistake 🔍</h2>

      <div className="d-flex flex-wrap gap-2 mb-4 fs-5" role="group" aria-label="Sentence words">
        {tokens.map((token, i) => (
          <Button
            key={i}
            variant={variantFor(i)}
            onClick={() => !answered && setSelected(i)}
            disabled={answered}
          >
            {token}
          </Button>
        ))}
      </div>

      {answered && (
        <div role="status">
          <p className={`fw-semibold ${isCorrect ? 'text-success' : 'text-danger'}`}>
            {isCorrect ? '✅ You found it!' : `❌ The mistake was “${item.wrong}”.`}
          </p>
          <p className="mb-1">
            <strong>Correct:</strong> {applyCorrection(item.sentence, item.wrong, item.correct)}
          </p>
          <p className="small text-muted">💡 {item.explanation}</p>
          <Button onClick={() => onDone(isCorrect)}>Next</Button>
        </div>
      )}
    </div>
  );
};

export default ErrorHunterItem;
