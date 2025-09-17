import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LiveTranslation = () => {
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "start_translation", lang: targetLang }));
      return;
    }

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
        console.error("❌ Error procesando mensaje:", e);
      }
    };

    ws.onclose = () => {
      setStatus("Desconectado");
      wsRef.current = null;
    };

    ws.onerror = () => setStatus("Error");

    wsRef.current = ws;
  };

  const playNextAudio = () => {
    if (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const audioUrl = audioQueueRef.current.shift();
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl!);
        playNextAudio();
      };
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
    if (["Activo", "Traduciendo", "Enviando"].includes(status)) return "#00c853"; // Verde Fresco
    return "#d50000"; // Rojo AI
  };

  return (
    <div className="flex flex-col items-center p-6 font-sans bg-gradient-to-br from-purple-600 via-blue-500 to-red-500 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-2">🌐 FlowState Live Translation</h1>
      <p className="text-lg mb-6 opacity-90">Innovación, conexión y dinamismo en tiempo real</p>

      <div className="flex items-center mb-6">
        <div
          style={{ backgroundColor: getStatusDotColor() }}
          className="h-4 w-4 rounded-full mr-2 animate-pulse"
        ></div>
        <p className="text-lg">
          <strong>Estado:</strong> {status}
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        {status === "Detenido" || status === "Desconectado" || status === "Error" ? (
          <button
            onClick={connectWebSocketAndStart}
            className="px-6 py-2 rounded-2xl bg-green-500 hover:bg-green-600 shadow-lg font-semibold"
          >
            Iniciar Traducción
          </button>
        ) : (
          <button
            onClick={stopTranslation}
            className="px-6 py-2 rounded-2xl bg-red-500 hover:bg-red-600 shadow-lg font-semibold"
          >
            Terminar Traducción
          </button>
        )}

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="px-4 py-2 rounded-xl text-black font-semibold"
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="de">Alemán</option>
        </select>

        <button
          onClick={() => setPlayAudio(!playAudio)}
          className={`px-6 py-2 rounded-2xl shadow-lg font-semibold ${
            playAudio ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-500 hover:bg-gray-600"
          }`}
        >
          {playAudio ? "🔊 Audio ON" : "🔇 Audio OFF"}
        </button>
      </div>

      <div className="w-full max-w-2xl space-y-3">
        <AnimatePresence>
          {translations.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="p-4 bg-white text-black rounded-2xl shadow-md"
            >
              {t}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveTranslation;
