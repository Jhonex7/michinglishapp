import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import ContributorCard from '../components/Contributor/ContributorCard';
import { QUIZ_TOPICS, formatCategoryName } from '../config/topics';
import { SOCIAL_NETWORKS } from '../config/socialNetworks';
import { toContributor } from '../helpers/contributors';
import { EMPTY_PROFILE, buildFilePath, buildInfoTemplate } from '../helpers/contributionTemplate';
import { isValidStudentCode, validateQuizInfo, validateVocabularyInfo } from '../validation/contentRules';
import { useSelector } from 'react-redux';

const REPO_URL = 'https://github.com/fredyunivalle/michinglishapp';

const steps = [
  ['Fork', 'Fork the repository and create a branch: feature/<student-code>/<topic>.'],
  ['Create', 'Generate your info.json below and save it at the path shown.'],
  ['Register', 'Add your student code to the "folders" list of that topic’s index.json (or run npm run contribute).'],
  ['Test', 'Run npm test and npm run check:contribution. Fix every red message.'],
  ['Pull request', 'Open a PR and fill in the template. The pipeline checks everything again.'],
];

const ContributePage = () => {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [pasted, setPasted] = useState('');
  const vocabularyCategories = Object.keys(useSelector((s) => s.vocabularypuzzle.categories));

  const update = (field) => (e) => setProfile((p) => ({ ...p, [field]: e.target.value }));
  const changeKind = (e) => {
    const kind = e.target.value;
    const topic = kind === 'quiz' ? QUIZ_TOPICS[0].id : vocabularyCategories[0] || 'animals';
    setProfile((p) => ({ ...p, kind, topic }));
  };

  const template = useMemo(() => buildInfoTemplate(profile), [profile]);
  const json = JSON.stringify(template, null, 2);
  const preview = toContributor(template.user, profile.studentCode.trim());
  const codeOk = !profile.studentCode || isValidStudentCode(profile.studentCode.trim());

  const check = useMemo(() => {
    if (!pasted.trim()) return null;
    try {
      const info = JSON.parse(pasted);
      const validate = Array.isArray(info.words) ? validateVocabularyInfo : validateQuizInfo;
      return { errors: validate(info, { strict: true }) };
    } catch (error) {
      return { errors: [`This is not valid JSON: ${error.message}`] };
    }
  }, [pasted]);

  return (
    <Container className="py-4">
      <h1 className="h2 fw-bold">🤝 Contribute to MichinglishAPP</h1>
      <p className="lead text-muted">
        Write questions or puzzles for your classmates. Your name, student code and favorite social
        network will appear next to every question you write.
      </p>

      <Row xs={1} md={5} className="g-2 mb-4">
        {steps.map(([title, text], i) => (
          <Col key={title}>
            <Card className="michi-card h-100">
              <Card.Body className="small">
                <div className="fw-bold">{i + 1}. {title}</div>
                {text}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="michi-card">
            <Card.Body>
              <h2 className="h5 fw-bold">1. Build your info.json</h2>
              <Form>
                <Row className="g-2">
                  <Col sm={6}>
                    <Form.Label htmlFor="kind">Type</Form.Label>
                    <Form.Select id="kind" value={profile.kind} onChange={changeKind}>
                      <option value="quiz">Quiz questions</option>
                      <option value="vocabulary">Vocabulary puzzle</option>
                    </Form.Select>
                  </Col>
                  <Col sm={6}>
                    <Form.Label htmlFor="topic">Topic</Form.Label>
                    <Form.Select id="topic" value={profile.topic} onChange={update('topic')}>
                      {profile.kind === 'quiz'
                        ? QUIZ_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)
                        : vocabularyCategories.map((c) => <option key={c} value={c}>{formatCategoryName(c)}</option>)}
                    </Form.Select>
                  </Col>
                  <Col sm={6}>
                    <Form.Label htmlFor="username">Your name</Form.Label>
                    <Form.Control id="username" value={profile.username} onChange={update('username')} placeholder="Ana Gómez" />
                  </Col>
                  <Col sm={6}>
                    <Form.Label htmlFor="code">Student code</Form.Label>
                    <Form.Control id="code" value={profile.studentCode} onChange={update('studentCode')} placeholder="2212345-3743" isInvalid={!codeOk} />
                    <Form.Control.Feedback type="invalid">Format: 7 digits, dash, 4 digits.</Form.Control.Feedback>
                  </Col>
                  <Col sm={6}>
                    <Form.Label htmlFor="network">Favorite social network</Form.Label>
                    <Form.Select id="network" value={profile.socialNetwork} onChange={update('socialNetwork')}>
                      {Object.entries(SOCIAL_NETWORKS).map(([id, n]) => <option key={id} value={id}>{n.label}</option>)}
                    </Form.Select>
                  </Col>
                  <Col sm={6}>
                    <Form.Label htmlFor="handle">Your user there</Form.Label>
                    <Form.Control id="handle" value={profile.socialLink} onChange={update('socialLink')} placeholder="@my_user" />
                  </Col>
                  <Col xs={12}>
                    <Form.Label htmlFor="image">Profile image URL (https)</Form.Label>
                    <Form.Control id="image" value={profile.profileImage} onChange={update('profileImage')} placeholder="https://github.com/my-user.png" />
                  </Col>
                </Row>
              </Form>

              <h3 className="h6 fw-bold mt-4">Preview: this is how you will appear</h3>
              <div className="border rounded-3 p-3 bg-light">
                <ContributorCard contributor={preview} label="Question by" />
              </div>

              <h3 className="h6 fw-bold mt-4">Save it as</h3>
              <code className="d-block mb-2">{buildFilePath(profile)}</code>
              <pre className="json-preview" data-testid="json-template">{json}</pre>
              <Button size="sm" variant="outline-primary" onClick={() => navigator.clipboard?.writeText(json)}>
                Copy JSON
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="michi-card mb-4">
            <Card.Body>
              <h2 className="h5 fw-bold">2. Check your file before the PR</h2>
              <p className="small text-muted">
                Paste your info.json. It runs the same rules as the pipeline that reviews your pull request.
              </p>
              <Form.Control
                as="textarea"
                rows={10}
                className="font-monospace small"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder='{ "user": { ... }, "topics": [ ... ] }'
                aria-label="Paste your info.json"
              />
              {check && (check.errors.length === 0 ? (
                <Alert variant="success" className="mt-3 mb-0">✅ Looks great! Ready for your pull request.</Alert>
              ) : (
                <Alert variant="danger" className="mt-3 mb-0">
                  <strong>Fix these {check.errors.length} problems:</strong>
                  <ul className="mb-0 small">{check.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </Alert>
              ))}
            </Card.Body>
          </Card>

          <Card className="michi-card">
            <Card.Body>
              <h2 className="h5 fw-bold">3. Want to contribute code?</h2>
              <p className="small">
                Besides questions, you can improve the app itself: new game modes, accessibility,
                new social network icons, tests… Look for issues labeled{' '}
                <strong>good first issue</strong> and read the contribution guide.
              </p>
              <div className="d-flex gap-2 flex-wrap">
                <Button href={`${REPO_URL}/blob/develop/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
                  Contribution guide
                </Button>
                <Button
                  variant="outline-primary"
                  href={`${REPO_URL}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Good first issues
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ContributePage;
