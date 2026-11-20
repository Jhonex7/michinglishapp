import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { Link, NavLink } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa6';

const AppNavbar = ({ onToggleSidebar }) => (
  <Navbar expand="md" sticky="top" className="michi-navbar py-2">
    <Container>
      <Button variant="light" onClick={onToggleSidebar} className="me-2" aria-label="Open activities menu">
        ☰
      </Button>
      <Navbar.Brand as={Link} to="/" className="michi-brand">
        🐱 Michinglish<span>APP</span>
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="main-nav" />
      <Navbar.Collapse id="main-nav">
        <Nav className="me-auto">
          <Nav.Link as={NavLink} to="/testknowledge">Check your knowledge</Nav.Link>
          <Nav.Link as={NavLink} to="/contributors">Contributors</Nav.Link>
          <Nav.Link as={NavLink} to="/contribute">Contribute</Nav.Link>
        </Nav>
        <Nav>
          <Nav.Link
            href="https://github.com/fredyunivalle/michinglishapp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source code on GitHub"
          >
            <FaGithub size={22} />
          </Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>
);

export default AppNavbar;
