import { useMemo } from 'react';
import { Alert, Container, Spinner } from 'react-bootstrap';
import QuizCard from '../components/Quiz/QuizCard';
import { useTopic } from '../hooks/useContent';
import { extractQuestionsWithContributor } from '../helpers/contributors';

const QuizPage = ({ topic }) => {
  const { entries, status, error } = useTopic(topic.id);
  const questions = useMemo(() => extractQuestionsWithContributor(entries), [entries]);

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
      {status === 'succeeded' && questions.length === 0 && (
        <Alert variant="info">
          No questions yet for {topic.title}. Be the first to contribute one! 🐾
        </Alert>
      )}
      {status === 'succeeded' && questions.length > 0 && (
        <QuizCard
          key={topic.id}
          title={`${topic.emoji} ${topic.title}`}
          description={topic.description}
          questions={questions}
        />
      )}
    </Container>
  );
};

export default QuizPage;
