// src/components/Oyente.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";

const Oyente: React.FC = () => {
  const [status, setStatus] = useState("Detenido");
  const [translations, setTranslations] = useState<string[]>([]);
  const [playAudio, setPlayAudio] = useState(true);
  const [targetLang, setTargetLang] = useState("es");
  const [room, setRoom] = useState("Sala1"); // Sala por defecto
  const wsRef = useRef<WebSocket | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  // Construye la URL del WebSocket dinámicamente según sala e idioma
  const getWsUrl = () => {
    return `${import.meta.env.VITE_API_URL}/ws/listener/${room}?lang=${targetLang}`;
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectToStream = () => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(getWsUrl());
    ws.onopen = () => setStatus("Activo");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
        if (data.translated_text) {
          setTranslations((prev) => [data.translated_text, ...prev].slice(0, 15));

          // Agregar a la cola de voz
          if (playAudio) {
            speechQueueRef.current.push(data.translated_text);
            if (!isSpeakingRef.current) speakNext();
          }
        }
      } catch (e) {
        console.error("Error al parsear mensaje:", e);
      }
    };
    ws.onclose = () => setStatus("Desconectado");
    ws.onerror = () => setStatus("Error");
    wsRef.current = ws;
  };

  // Función para reproducir la siguiente frase en la cola
  const speakNext = () => {
    if (speechQueueRef.current.length === 0 || !playAudio) {
      isSpeakingRef.current = false;
      return;
    }

    const text = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang; // Ajusta el idioma del sintetizador
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      speakNext(); // Reproducir la siguiente frase
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopTranslation = () => {
    if (wsRef.current) wsRef.current.close();
    setStatus("Detenido");
    speechQueueRef.current = [];
    window.speechSynthesis.cancel();
  };

  const toggleAudio = () => {
    setPlayAudio(!playAudio);
    if (!playAudio && speechQueueRef.current.length > 0 && !isSpeakingRef.current) {
      speakNext();
    }
    if (playAudio) {
      window.speechSynthesis.cancel();
    }
  };

  const getStatusDotColor = () => {
    if (status === "Activo") return "green";
    if (status === "Desconectado") return "orange";
    return "red";
  };

  return (
    <div className="lt-container">
      <h1 className="lt-title">👂 Modo Oyente</h1>
      <p className="lt-subtitle">Elige tu idioma y sala para escuchar la traducción en tiempo real.</p>

      <div className="lt-status">
        <div className="lt-status-dot" style={{ backgroundColor: getStatusDotColor() }}></div>
        <p><strong>Estado:</strong> {status}</p>
      </div>

      <div className="lt-controls">
        {(status === "Detenido" || status === "Desconectado" || status === "Error") ? (
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
          <option value="zh-CN">Chino</option>
        </select>

        <select
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="lt-select"
          disabled={status === "Activo"}
        >
          <option value="Sala1">Sala 1</option>
          <option value="Sala2">Sala 2</option>
          <option value="Sala3">Sala 3</option>
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
