import React, { useState, useEffect, useRef } from "react";
import "./App.css"; 

const App = () => {
  const [status, setStatus] = useState("Detenido");
  const [translations, setTranslations] = useState<string[]>([]);
  const [playAudio, setPlayAudio] = useState(true);
  const [targetLang, setTargetLang] = useState("es");
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const wsUrl = `ws://${window.location.hostname}:8000/ws/live`;

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocketAndStart = () => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "start_translation", lang: targetLang, audio: playAudio }));
      setStatus("Activo");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
        if (data.text) {
          setTranslations((prev) => [data.text, ...prev].slice(0, 3));
        }
        if (playAudio && data.audio) {
          const audioUrl = `data:audio/wav;base64,${data.audio}`;
          audioQueueRef.current.push(audioUrl);
          if (!isPlayingRef.current) playNextAudio();
        }
      } catch (e) {
        console.error("Error:", e);
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

      audio.onended = () => playNextAudio();
      audio.onerror = () => playNextAudio();

      audio.play().catch(() => {});
    } else {
      isPlayingRef.current = false;
    }
  };

  const stopTranslation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "stop_translation" }));
      wsRef.current.close();
    }
    setStatus("Detenido");
  };

  const toggleAudio = () => {
    setPlayAudio(!playAudio);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "toggle_audio", audio: !playAudio }));
    }
  };

  const getStatusDotColor = () => {
    if (["Activo", "Traduciendo", "Enviando"].includes(status)) return "green";
    return "red";
  };

  return (
    <div className="lt-container">
      <h1 className="lt-title">🌐 FlowState Live Translation</h1>
      <p className="lt-subtitle">Innovación, conexión y dinamismo en tiempo real</p>

      <div className="lt-status">
        <div
          className="lt-status-dot"
          style={{ backgroundColor: getStatusDotColor() }}
        ></div>
        <p>
          <strong>Estado:</strong> {status}
        </p>
      </div>

      <div className="lt-controls">
        {status === "Detenido" || status === "Desconectado" || status === "Error" ? (
          <button onClick={connectWebSocketAndStart} className="lt-btn start">
            Iniciar Traducción
          </button>
        ) : (
          <button onClick={stopTranslation} className="lt-btn stop">
            Terminar Traducción
          </button>
        )}

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="lt-select"
          disabled={status === "Activo"}  // 🚫 no se puede cambiar idioma en ejecución
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="de">Alemán</option>
        </select>

        <button
          onClick={toggleAudio}
          className={`lt-btn ${playAudio ? "audio-on" : "audio-off"}`}
        >
          {playAudio ? "🔊 Audio ON" : "🔇 Audio OFF"}
        </button>
      </div>

      <div className="lt-translations">
        {translations.map((t, idx) => (
          <p key={idx} className="lt-translation">
            {t}
          </p>
        ))}
      </div>
    </div>
  );
};

export default App;
