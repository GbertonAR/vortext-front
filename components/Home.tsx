// src/components/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="main-title">🌐 **Vortex** Live Translation</h1>
        <p className="subtitle">
          Tu voz, sin barreras. Conecta, traduce, evoluciona.
        </p>

        <div className="mode-selector">
          <p className="selector-instruction">
            Elige tu rol en la conexión en tiempo real:
          </p>
          <div className="button-group">
            <Link to="/orador" className="mode-button speaker-button">
              <span className="icon">🗣️</span> Modo Orador
            </Link>
            <Link to="/oyente" className="mode-button listener-button">
              <span className="icon">👂</span> Modo Oyente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;