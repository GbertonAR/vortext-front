import React, { useState, useEffect, useRef } from "react";
import "./App.css";

type ServerStatus = "Detenido" | "Activo" | "Traduciendo" | "Enviando" | "Desconectado" | "Error";

const App = () => {
  const [status, setStatus] = useState<ServerStatus>("Detenido");
  const [translations, setTranslations] = useState<string[]>([]);
  const [playAudio, setPlayAudio] = useState<boolean>(true);
  const [targetLang, setTargetLang] = useState<string>("es");
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const wsUrl = `ws://${window.location.hostname}:8000/ws/live`;

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
      stopAndClearAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: stop current audio and clear queue
  const stopAndClearAudio = () => {
    // stop current audio
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = "";
      } catch {}
      currentAudioRef.current = null;
    }

    // revoke queued object urls and clear
    while (audioQueueRef.current.length > 0) {
      const u = audioQueueRef.current.shift();
      try { if (u?.startsWith("blob:")) URL.revokeObjectURL(u); } catch {}
    }
    isPlayingRef.current = false;
  };

  const connectWebSocketAndStart = () => {
    // If already connected and open, just send start command with language
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "start_translation", lang: targetLang }));
      setStatus("Activo");
      // clear previous translations to highlight fresh stream
      setTranslations([]);
      return;
    }

    // create new socket
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // send start command including the desired language
      ws.send(JSON.stringify({ command: "start_translation", lang: targetLang }));
      setStatus("Activo");
      setTranslations([]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.status) {
          setStatus(data.status);
        }

        if (data.text) {
          // store last 3 translations
          setTranslations((prev) => {
            const next = [data.text, ...prev];
            return next.slice(0, 3);
          });
        }

        // if audio enabled and payload contains Base64 audio string
        if (playAudio && data.audio) {
          // create data URL from base64
          const audioUrl = `data:audio/wav;base64,${data.audio}`;
          audioQueueRef.current.push(audioUrl);

          // start playback if not playing
          if (!isPlayingRef.current) {
            playNextAudio();
          }
        }

      } catch (e) {
        console.error("Error parsing ws message:", e, event.data);
      }
    };

    ws.onclose = () => {
      setStatus("Detenido");
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("Error");
    };

    wsRef.current = ws;
  };

  const playNextAudio = async () => {
    // if audio playback is disabled, clear queue and stop
    if (!playAudio) {
      stopAndClearAudio();
      return;
    }

    const nextUrl = audioQueueRef.current.shift();
    if (!nextUrl) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      return;
    }

    isPlayingRef.current = true;

    // Create and play audio
    const audio = new Audio(nextUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      // revoke if it was a blob (not data:), just in case
      try { if (nextUrl.startsWith("blob:")) URL.revokeObjectURL(nextUrl); } catch {}
      currentAudioRef.current = null;
      // continue to next only if playAudio is true
      if (playAudio) {
        playNextAudio();
      } else {
        stopAndClearAudio();
      }
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      currentAudioRef.current = null;
      // try next
      if (playAudio) {
        playNextAudio();
      } else {
        stopAndClearAudio();
      }
    };

    try {
      await audio.play();
    } catch (e) {
      console.error("Play() rejected or blocked:", e);
      // ensure we continue or stop gracefully
      currentAudioRef.current = null;
      isPlayingRef.current = false;
    }
  };

  const stopTranslation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "stop_translation" }));
      setStatus("Detenido");
    }
    // also stop and clear audio locally
    stopAndClearAudio();
  };

  // toggles audio. When turning off, stop current and clear queue immediately.
  const toggleAudio = () => {
    const next = !playAudio;
    setPlayAudio(next);
    if (!next) {
      // turning audio OFF: stop playback immediately & clear queue
      stopAndClearAudio();
    } else {
      // turning audio ON: if there are queued audios, start playback
      if (!isPlayingRef.current && audioQueueRef.current.length > 0) {
        playNextAudio();
      }
    }
  };

  // Disable language select when translation is active
  const isTranslationActive = ["Activo", "Traduciendo", "Enviando"].includes(status);

  return (
    <div className="lt-container" role="main">
      <h1 className="lt-title">🌐 FlowState Live Translation</h1>
      <p className="lt-subtitle">Innovación, conexión y dinamismo en tiempo real</p>

      <div className="lt-status" aria-live="polite">
        <div
          className="lt-status-dot"
          style={{ backgroundColor: isTranslationActive ? "green" : "red" }}
          aria-hidden
        />
        <p><strong>Estado:</strong> {status}</p>
      </div>

      <div className="lt-controls" role="region" aria-label="Controles de traducción">
        {(!isTranslationActive) ? (
          <button onClick={connectWebSocketAndStart} className="lt-btn start" aria-pressed="false">
            Iniciar Traducción
          </button>
        ) : (
          <button onClick={stopTranslation} className="lt-btn stop" aria-pressed="true">
            Terminar Traducción
          </button>
        )}

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="lt-select"
          disabled={isTranslationActive}
          aria-disabled={isTranslationActive}
          title={isTranslationActive ? "No se puede cambiar el idioma mientras la traducción está activa" : "Seleccionar idioma de destino"}
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="de">Alemán</option>
        </select>

        <button onClick={toggleAudio} className={`lt-btn ${playAudio ? "audio-on" : "audio-off"}`} aria-pressed={playAudio}>
          {playAudio ? "🔊 Audio ON" : "🔇 Audio OFF"}
        </button>
      </div>

      <div className="lt-translations" aria-live="polite">
        {translations.length === 0 ? (
          <p style={{ margin: 0 }}>No hay traducciones aún.</p>
        ) : (
          translations.map((t, idx) => (
            <p key={idx} className="lt-translation">
              {t}
            </p>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
