// src/components/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";
import "../src/index.css"; // Asegúrate de crear este archivo CSS para los estilos

const Home: React.FC = () => {
  return (
    <div className="lt-container">
      <h1 className="lt-title">🌐 FlowState Live Translation</h1>
      <p className="lt-subtitle">Innovación, conexión y dinamismo en tiempo real</p>

      <div className="lt-controls">
        <Link to="/orador" className="lt-btn start">
          <span role="img" aria-label="speaker">🗣️</span> Orador
        </Link>
        <Link to="/oyente" className="lt-btn audio-on">
          <span role="img" aria-label="listener">👂</span> Oyente
        </Link>
      </div>
    </div>
  );
};

export default Home;