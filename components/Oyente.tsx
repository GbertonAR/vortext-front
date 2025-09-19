// components/Oyente.tsx
import React, { useState, useRef, useEffect } from 'react';

const Oyente: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [translatedText, setTranslatedText] = useState('Esperando traducción...');
  const [isListening, setIsListening] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const connectToStream = () => {
    if (ws.current) {
      ws.current.close();
    }
    
    // Conectar al WebSocket del oyente con el idioma seleccionado
    ws.current = new WebSocket(`ws://localhost:8000/ws/listener?lang=${selectedLanguage}`);

    ws.current.onopen = () => {
      console.log(`Conectado como oyente en idioma: ${selectedLanguage}`);
      setTranslatedText('Conectado. Esperando mensajes del orador...');
      setIsListening(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.translated_text) {
        console.log('Mensaje recibido:', data);
        setTranslatedText(data.translated_text);
      }
    };

    ws.current.onclose = () => {
      console.log('Desconectado del stream.');
      setTranslatedText('Desconectado del orador. Por favor, reconéctate.');
      setIsListening(false);
    };

    ws.current.onerror = (event) => {
      console.error("Error en WebSocket:", event);
      setTranslatedText('Error de conexión. Revisa el backend.');
      setIsListening(false);
    };
  };

  const disconnectFromStream = () => {
    if (ws.current) {
      ws.current.close();
      setIsListening(false);
    }
  };

  // Limpiar la conexión al desmontar el componente
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Modo Oyente 👂</h1>
      <p>Selecciona tu idioma para escuchar la traducción en vivo.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isListening}
          style={{ padding: '8px', fontSize: '1em' }}
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
          <option value="pt">Portugués</option>
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={connectToStream}
          disabled={isListening}
          style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', marginRight: '10px' }}
        >
          {isListening ? 'Escuchando...' : 'Conectar'}
        </button>
        <button
          onClick={disconnectFromStream}
          disabled={!isListening}
          style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none' }}
        >
          Desconectar
        </button>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <p style={{ fontSize: '1.5em', fontWeight: 'bold' }}>Traducción en vivo:</p>
        <p style={{ fontSize: '1.5em', fontStyle: 'italic', color: '#333' }}>{translatedText}</p>
      </div>
    </div>
  );
};

export default Oyente;