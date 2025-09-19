// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Orador from '../components/Orador';
import Oyente from '../components/Oyente';


const App: React.FC = () => {
  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
          <Link to="/orador" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Modo Orador</Link>
          <Link to="/oyente" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Modo Oyente</Link>
        </nav>
        <Routes>
          <Route path="/orador" element={<Orador />} />
          <Route path="/oyente" element={<Oyente />} />
          <Route path="/" element={
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <h1>Elige tu modo de conexión</h1>
              <p>Selecciona si eres el orador o un oyente para iniciar la sesión.</p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;