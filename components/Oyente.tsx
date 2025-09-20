// src/components/Oyente.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";

const Oyente: React.FC = () => {
  const [status, setStatus] = useState("Detenido");
  const [translations, setTranslations] = useState<string[]>([]);
  const [playAudio, setPlayAudio] = useState(true);
  const [targetLang, setTargetLang] = useState("es");
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // URL del WebSocket, recuerda reemplazarla con la de tu despliegue en Azure
  // const wsUrl = `wss://127.0.0.1:8000/ws/listener?lang=${targetLang}`;

  // URL del WebSocket, recuerda reemplazarla con la de tu despliegue Local
  const wsUrl = `${import.meta.env.VITE_API_URL}/ws/listener?lang=${targetLang}`;

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);


  
  const connectToStream = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => setStatus("Activo");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
        if (data.translated_text) {
          setTranslations((prev) => [data.translated_text, ...prev].slice(0, 15));
        }
        if (playAudio && data.audio_url) {
          audioQueueRef.current.push(data.audio_url);
          if (!isPlayingRef.current) playNextAudio();
        }
      } catch (e) {
        console.error("Error al parsear el mensaje:", e);
      }
    };
    ws.onclose = () => setStatus("Desconectado");
    ws.onerror = () => setStatus("Error");
    wsRef.current = ws;
  };

  const playNextAudio = () => {
    if (audioQueueRef.current.length > 0 && playAudio) {
      isPlayingRef.current = true;
      const audioUrl = audioQueueRef.current.shift();
      const audio = new Audio(audioUrl!);
      audio.play().catch(e => console.error("Error al reproducir audio:", e));
      audio.onended = () => playNextAudio();
    } else {
      isPlayingRef.current = false;
    }
  };

  const stopTranslation = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus("Detenido");
  };

  const toggleAudio = () => {
    setPlayAudio(!playAudio);
  };

  const getStatusDotColor = () => {
    if (status === "Activo") return "green";
    return "red";
  };

  return (
    <div className="lt-container">
      <h1 className="lt-title">👂 Modo Oyente</h1>
      <p className="lt-subtitle">Elige tu idioma y escucha la traducción en tiempo real.</p>

      <div className="lt-status">
        <div className="lt-status-dot" style={{ backgroundColor: getStatusDotColor() }}></div>
        <p><strong>Estado:</strong> {status}</p>
      </div>

      <div className="lt-controls">
        {status === "Detenido" || status === "Desconectado" || status === "Error" ? (
          <button onClick={connectToStream} className="lt-btn start">
            Iniciar Traducción
          </button>
        ) : (
          <button onClick={stopTranslation} className="lt-btn stop">
            Detener Traducción
          </button>
        )}
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="lt-select"
          disabled={status === "Activo"}
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="de">Alemán</option>
          <option value="pt">Portugués</option>
        </select>
        <button
          onClick={toggleAudio}
          className={`lt-btn ${playAudio ? "audio-on" : "audio-off"}`}
        >
          <span role="img" aria-label="volume">{playAudio ? "🔊" : "🔇"}</span> Audio {playAudio ? "ON" : "OFF"}
        </button>
      </div>

      <div className="lt-translations">
        {translations.map((t, idx) => (
          <p key={idx} className="lt-translation">{t}</p>
        ))}
      </div>
      <div style={{ marginTop: '20px' }}>
        <Link to="/" className="lt-btn audio-off">Volver</Link>
      </div>
    </div>
  );
};

export default Oyente;