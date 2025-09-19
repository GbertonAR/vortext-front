// src/components/Home.tsx
import React from 'react';

const Home: React.FC = () => {
  return (

    <div className="lt-container">
      <h1 className="lt-title">🌐 FlowState Live Translation</h1>
      <p className="lt-subtitle">Innovación, conexión y dinamismo en tiempo real</p>


        <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px' }}>
            <h1>Elige tu modo de conexión</h1>
            <p style={{ fontSize: '1.2em', color: '#555' }}>
                    Selecciona si eres el orador o un oyente para iniciar la sesión.
            </p>
            <div style={{ marginTop: '30px' }}>
                <button style={{ margin: '10px', padding: '15px 30px', fontSize: '1.1em', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>Modo Orador</button>
                <button style={{ margin: '10px', padding: '15px 30px', fontSize: '1.1em', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>Modo Oyente</button>
            </div>
        </div>
    </div>
  );
};

export default Home;