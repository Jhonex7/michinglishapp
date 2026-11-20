import { useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { isSameSentence, tokenize } from '../../games/sentenceTools';
import { shuffleArray } from '../../helpers/shuffleArray';

/** Shuffles the words, trying not to show them already in order. */
const scramble = (words) => {
  const tokens = words.map((text, id) => ({ id, text }));
  let shuffled = shuffleArray(tokens);
  for (let tries = 0; tries < 5 && shuffled.every((t, i) => t.text === words[i]); tries += 1) {
    shuffled = shuffleArray(tokens);
  }
  return shuffled;
};

/**
 * One Sentence Builder exercise: tap the words in the right order.
 * item: { sentence, hint? }
 */
const SentenceBuilderItem = ({ item, onDone }) => {
  const words = useMemo(() => tokenize(item.sentence), [item.sentence]);
  const [pool] = useState(() => scramble(words));
  const [picked, setPicked] = useState([]); // token ids in the order chosen
  const [result, setResult] = useState(null); // null | true | false

  const byId = (id) => pool.find((t) => t.id === id);
  const pickedTexts = picked.map((id) => byId(id).text);
  const available = pool.filter((t) => !picked.includes(t.id));

  const pick = (id) => !result && setPicked((p) => [...p, id]);
  const unpick = (id) => !result && setPicked((p) => p.filter((x) => x !== id));
  const check = () => setResult(isSameSentence(pickedTexts, item.sentence));

  return (
    <div>
      <h2 className="h5 mb-1">Build the sentence</h2>
      {item.hint && <p className="small text-muted mb-3">💡 {item.hint}</p>}

      <div
        className={`border rounded-3 p-3 mb-3 d-flex flex-wrap gap-2 ${
          result === true ? 'border-success bg-success-subtle' : result === false ? 'border-danger bg-danger-subtle' : 'bg-light'
        }`}
        style={{ minHeight: 64 }}
        aria-label="Your sentence"
        role="group"
      >
        {picked.length === 0 && <span className="text-muted small align-self-center">Tap the words below…</span>}
        {picked.map((id) => (
          <Button key={id} variant="primary" size="sm" onClick={() => unpick(id)} disabled={result !== null}>
            {byId(id).text}
          </Button>
        ))}
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Available words">
        {available.map((t) => (
          <Button key={t.id} variant="outline-primary" size="sm" onClick={() => pick(t.id)} disabled={result !== null}>
            {t.text}
          </Button>
        ))}
      </div>

      {result === null ? (
        <div className="d-flex gap-2">
          <Button onClick={check} disabled={available.length > 0}>Check</Button>
          <Button variant="outline-secondary" onClick={() => setPicked([])} disabled={picked.length === 0}>Clear</Button>
        </div>
      ) : (
        <div role="status">
          {result ? (
            <p className="fw-semibold text-success">✅ Correct!</p>
          ) : (
            <p className="fw-semibold text-danger">
              ❌ The correct sentence is: <span className="text-body">“{item.sentence}”</span>
            </p>
          )}
          <Button onClick={() => onDone(result)}>Next</Button>
        </div>
      )}
    </div>
  );
};

export default SentenceBuilderItem;
