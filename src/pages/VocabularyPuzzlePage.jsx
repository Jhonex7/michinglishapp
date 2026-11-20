import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState } from 'react';
import { Alert, Container, Form, Spinner } from 'react-bootstrap';
import MemoryMatchGame from '../components/modules/VocabularyMemoryModule';
import { toContributor } from '../helpers/contributors';
import { formatCategoryName } from '../config/topics';

const VocabularyPuzzlePage = () => {
  const { category } = useParams();
  const status = useSelector((state) => state.vocabularypuzzle.status);
  const data = useSelector((state) => state.vocabularypuzzle.categories[category]) || [];
  const [selection, setSelection] = useState({ category, index: 0 });
  // Reset the selected student when the category changes.
  const selectedIndex = selection.category === category ? selection.index : 0;

  if (status === 'loading' || status === 'idle') {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }
  if (!data.length) {
    return <Container className="py-4"><Alert variant="warning">No puzzles found for “{category}”.</Alert></Container>;
  }

  const selected = data[selectedIndex] || data[0];

  return (
    <Container className="py-4">
      <h1 className="h2 fw-bold mb-3">🧩 {formatCategoryName(category)} puzzle</h1>

      {data.length > 1 && (
        <Form.Group className="mb-4" style={{ maxWidth: 480 }}>
          <Form.Label htmlFor="contributor-select">Choose a classmate’s puzzle:</Form.Label>
          <Form.Select
            id="contributor-select"
            value={selectedIndex}
            onChange={(e) => setSelection({ category, index: Number(e.target.value) })}
          >
            {data.map((entry, index) => (
              <option key={entry.studentCode || index} value={index}>
                {entry.user?.username || `Student ${index + 1}`}
                {entry.studentCode ? ` (${entry.studentCode})` : ''}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      <MemoryMatchGame
        key={`${category}-${selected.studentCode}`}
        contributor={toContributor(selected.user, selected.studentCode)}
        vocabPairs={selected.words}
      />
    </Container>
  );
};

export default VocabularyPuzzlePage;
