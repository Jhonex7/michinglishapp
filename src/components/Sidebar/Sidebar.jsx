import { Offcanvas, ListGroup } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { QUIZ_TOPICS, TOPIC_GROUPS, formatCategoryName } from '../../config/topics';

const SidebarLink = ({ to, onClose, children }) => (
  <ListGroup.Item action as={NavLink} to={to} onClick={onClose}>
    {children}
  </ListGroup.Item>
);

const Sidebar = ({ show, onClose }) => {
  const categories = useSelector((state) => state.vocabularypuzzle.categories);

  return (
    <Offcanvas show={show} onHide={onClose} placement="start">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Activities</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {TOPIC_GROUPS.map((group) => (
          <div key={group.id} className="mb-3">
            <p className="text-muted small text-uppercase fw-semibold mb-1">{group.title}</p>
            <ListGroup variant="flush">
              {QUIZ_TOPICS.filter((t) => t.group === group.id).map((topic) => (
                <SidebarLink key={topic.id} to={`/${topic.path}`} onClose={onClose}>
                  {topic.emoji} {topic.title}
                </SidebarLink>
              ))}
            </ListGroup>
          </div>
        ))}

        <p className="text-muted small text-uppercase fw-semibold mb-1">🧩 Vocabulary puzzles</p>
        <ListGroup variant="flush">
          {Object.keys(categories).map((category) => (
            <SidebarLink key={category} to={`/vocabularypuzzel/${category}`} onClose={onClose}>
              {formatCategoryName(category)}
            </SidebarLink>
          ))}
        </ListGroup>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default Sidebar;
