import React, { useState, useEffect, useRef } from "react";

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
      ws.send(JSON.stringify({ command: "start_translation", lang: targetLang }));
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
    if (audioQueueRef.current.length > 0) {
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
      wsRef.current.send("stop_translation");
    }
  };

  const getStatusDotColor = () => {
    if (["Activo", "Traduciendo", "Enviando"].includes(status)) return "green";
    return "red";
  };

  return (
    <div style={{ textAlign: "center", margin: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#333" }}>
        🌐 FlowState Live Translation
      </h1>
      <p style={{ marginBottom: "1rem", fontSize: "1.1rem", color: "#555" }}>
        Innovación, conexión y dinamismo en tiempo real
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
        <div
          style={{
            height: "20px",
            width: "20px",
            borderRadius: "50%",
            backgroundColor: getStatusDotColor(),
            marginRight: "10px",
          }}
        ></div>
        <p>
          <strong>Estado:</strong> {status}
        </p>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        {status === "Detenido" || status === "Desconectado" || status === "Error" ? (
          <button
            onClick={connectWebSocketAndStart}
            style={{
              padding: "10px 20px",
              marginRight: "10px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#2ecc71",
              color: "white",
              cursor: "pointer",
            }}
          >
            Iniciar Traducción
          </button>
        ) : (
          <button
            onClick={stopTranslation}
            style={{
              padding: "10px 20px",
              marginRight: "10px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#e74c3c",
              color: "white",
              cursor: "pointer",
            }}
          >
            Terminar Traducción
          </button>
        )}

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          style={{ padding: "10px", borderRadius: "6px", marginRight: "10px" }}
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="de">Alemán</option>
        </select>

        <button
          onClick={() => setPlayAudio(!playAudio)}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: playAudio ? "#3498db" : "#7f8c8d",
            color: "white",
            cursor: "pointer",
          }}
        >
          {playAudio ? "🔊 Audio ON" : "🔇 Audio OFF"}
        </button>
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
          textAlign: "left",
          minHeight: "120px",
        }}
      >
        {translations.map((t, idx) => (
          <p key={idx} style={{ margin: "0.5rem 0", fontSize: "1.1rem", color: "#333" }}>
            {t}
          </p>
        ))}
      </div>
    </div>
  );
};

export default App;
