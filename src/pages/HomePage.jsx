import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import catTeacher from '../assets/cat-teacher.webp';
import { QUIZ_TOPICS, TOPIC_GROUPS, formatCategoryName } from '../config/topics';
import { useAllContent } from '../hooks/useContent';
import { buildContributorDirectory } from '../helpers/contributors';
import { Avatar } from '../components/Contributor/ContributorCard';

const countQuestions = (entries = []) =>
  entries.reduce(
    (total, entry) => total + (entry.topics || []).reduce((n, t) => n + (t.questions?.length || 0), 0),
    0,
  );

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const TopicCard = ({ to, emoji, title, description, meta }) => (
  <Card as={Link} to={to} className="michi-card topic-card h-100">
    <Card.Body>
      <div className="d-flex align-items-start gap-3">
        <span className="topic-emoji" aria-hidden="true">{emoji}</span>
        <div>
          <Card.Title as="h3" className="h6 fw-bold mb-1">{title}</Card.Title>
          {description && <Card.Text className="small text-muted mb-2">{description}</Card.Text>}
          {meta && <div className="small fw-semibold text-body-secondary">{meta}</div>}
        </div>
      </div>
    </Card.Body>
  </Card>
);

const HomePage = () => {
  const { quizData, vocabularyData, loading } = useAllContent();

  const contributors = useMemo(
    () => buildContributorDirectory(quizData, vocabularyData, QUIZ_TOPICS),
    [quizData, vocabularyData],
  );
  const totalQuestions = useMemo(
    () => Object.values(quizData).reduce((n, entries) => n + countQuestions(entries), 0),
    [quizData],
  );
  const stat = (value) => (loading && !value ? '…' : value);

  return (
    <Container className="py-4">
      <section className="michi-hero p-4 p-md-5 mb-5">
        <Row className="align-items-center g-4">
          <Col md={6} className="text-center text-md-start">
            <h1 className="display-5">Learn English with <span className="text-primary">Michi</span> 🐾</h1>
            <p className="lead">
              Quizzes and puzzles written <strong>by students, for students</strong>. Every question
              shows who created it: play, learn and add your own!
            </p>
            <div className="d-flex gap-2 justify-content-center justify-content-md-start flex-wrap">
              <Button as={Link} to="/testknowledge" size="lg">Start playing</Button>
              <Button as={Link} to="/contribute" size="lg" variant="outline-primary">Add your question</Button>
            </div>
          </Col>
          <Col md={6} className="text-center">
            <img
              src={catTeacher}
              alt="Michi, the teacher cat"
              className="img-fluid"
              style={{ width: '100%', maxWidth: 420, mixBlendMode: 'multiply' }}
            />
          </Col>
        </Row>
      </section>

      <Row className="text-center mb-5 g-3">
        <Col xs={4}><div className="stat-number">{QUIZ_TOPICS.length + Object.keys(vocabularyData).length}</div><div className="small text-muted">activities</div></Col>
        <Col xs={4}><div className="stat-number">{stat(totalQuestions)}</div><div className="small text-muted">questions</div></Col>
        <Col xs={4}><div className="stat-number">{stat(contributors.length)}</div><div className="small text-muted">student contributors</div></Col>
      </Row>

      {TOPIC_GROUPS.map((group) => (
        <section key={group.id} className="mb-5">
          <h2 className="h4 fw-bold mb-3">{group.title}</h2>
          <Row xs={1} sm={2} lg={3} className="g-3">
            {QUIZ_TOPICS.filter((t) => t.group === group.id).map((topic) => (
              <Col key={topic.id}>
                <TopicCard
                  to={`/${topic.path}`}
                  emoji={topic.emoji}
                  title={topic.title}
                  description={topic.description}
                  meta={`${topic.level} · ${plural((quizData[topic.id] || []).length, 'contributor')}`}
                />
              </Col>
            ))}
          </Row>
        </section>
      ))}

      <section className="mb-5">
        <h2 className="h4 fw-bold mb-3">🧩 Vocabulary puzzles</h2>
        <Row xs={2} sm={3} lg={4} className="g-3">
          {Object.entries(vocabularyData).map(([category, entries]) => (
            <Col key={category}>
              <TopicCard
                to={`/vocabularypuzzel/${category}`}
                emoji="🃏"
                title={formatCategoryName(category)}
                meta={plural(entries.length, 'puzzle')}
              />
            </Col>
          ))}
        </Row>
      </section>

      <section className="michi-card bg-white p-4 p-md-5 text-center">
        <h2 className="h4 fw-bold">Made by our students 💛</h2>
        <p className="text-muted">Every question in this app was written by a student. Yours could be next!</p>
        <div className="d-flex flex-wrap justify-content-center gap-2 my-3" aria-label="Some contributors">
          {contributors.slice(0, 24).map((c) => (
            <span key={c.code || c.name} title={c.name}><Avatar contributor={c} size={44} /></span>
          ))}
        </div>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <Button as={Link} to="/contributors" variant="outline-primary">Meet all contributors</Button>
          <Button as={Link} to="/contribute">How to contribute</Button>
        </div>
      </section>
    </Container>
  );
};

export default HomePage;
