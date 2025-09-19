// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Orador from '../components/Orador';
import Oyente from '../components/Oyente';
import Home from '../components/Home'; // ¡Importa el nuevo componente Home!

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Inicio</Link>
          <Link to="/orador" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Modo Orador</Link>
          <Link to="/oyente" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Modo Oyente</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} /> {/* Usa el componente Home aquí */}
          <Route path="/orador" element={<Orador />} />
          <Route path="/oyente" element={<Oyente />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;