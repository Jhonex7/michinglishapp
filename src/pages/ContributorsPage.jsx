import { useMemo, useState } from 'react';
import { Badge, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import ContributorCard from '../components/Contributor/ContributorCard';
import { useAllContent } from '../hooks/useContent';
import { buildContributorDirectory } from '../helpers/contributors';
import { QUIZ_TOPICS } from '../config/topics';

const ContributorsPage = () => {
  const { quizData, vocabularyData, loading } = useAllContent();
  const [search, setSearch] = useState('');

  const contributors = useMemo(
    () => buildContributorDirectory(quizData, vocabularyData, QUIZ_TOPICS),
    [quizData, vocabularyData],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contributors;
    return contributors.filter((c) =>
      [c.name, c.code, c.social.handle].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [contributors, search]);

  return (
    <Container className="py-4">
      <h1 className="h2 fw-bold">🏅 Hall of contributors</h1>
      <p className="text-muted">
        {contributors.length} students have written questions and puzzles for this app. Thank you!
      </p>

      <Form.Control
        type="search"
        placeholder="Search by name, student code or social handle…"
        className="mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search contributors"
      />

      {loading && contributors.length === 0 ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-3">
          {filtered.map((c) => (
            <Col key={c.code || c.name}>
              <Card className="michi-card h-100">
                <Card.Body>
                  <ContributorCard contributor={c} />
                  <div className="mt-3 small">
                    <strong>{c.questions}</strong> items in:{' '}
                    {c.topics.map((t) => (
                      <Badge key={t} bg="light" text="dark" className="border me-1 mb-1 fw-normal">{t}</Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default ContributorsPage;
