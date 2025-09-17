import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [status, setStatus] = useState('Detenido');
  const [translation, setTranslation] = useState('Presiona Iniciar para comenzar');
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const wsUrl = `ws://${window.location.hostname}:8000/ws/live`;

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const playNextAudio = () => {
    if (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const audioUrl = audioQueueRef.current.shift();
      if (!audioUrl) return;
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.error("Error de auto-play:", e));
      audio.onended = () => {
        isPlayingRef.current = false;
        playNextAudio();
      };
      audio.onerror = (e) => {
        console.error("Error al reproducir audio:", e);
        isPlayingRef.current = false;
        playNextAudio();
      };
    } else {
      isPlayingRef.current = false;
    }
  };

  const connect = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("start_translation");
      setStatus('Activo');
      return;
    }

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("WebSocket Conectado");
      wsRef.current?.send("start_translation");
      setStatus('Activo');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
        if (data.text) setTranslation(data.text);
        if (data.audio) {
          const audioUrl = `data:audio/wav;base64,${data.audio}`;
          audioQueueRef.current.push(audioUrl);
          if (!isPlayingRef.current) {
            playNextAudio();
          }
        }
      } catch (e) {
        console.error("Error procesando mensaje:", e);
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket Desconectado");
      setStatus('Detenido');
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setStatus('Error');
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.send("stop_translation");
    }
  };

  const isListening = status === 'Activo' || status === 'Traduciendo' || status === 'Enviando';
  
  const buttonStyle = {
    background: isListening ? 'linear-gradient(to bottom right, #AA00FF, #FF007F)' : 'transparent',
    border: isListening ? 'none' : '2px solid #00F2FF',
    boxShadow: isListening ? '0 0 25px #FF007F, 0 0 35px #00F2FF' : '0 0 15px #00F2FF',
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeInOut" } },
  };

  const statusVariants = {
    typing: {
      width: ["0%", "100%"],
      opacity: [0.5, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "linear",
      },
    },
    stopped: { width: "100%", opacity: 1 },
  };

  const backgroundVariants = {
    stopped: { backgroundColor: "#2721E2FF", transition: { duration: 1 } },
    active: { backgroundColor: "#C52D97FF", transition: { duration: 1 } },
  };

  return (
    <motion.main
      className="relative w-full h-screen flex justify-center items-center font-sans overflow-hidden text-white"
      variants={backgroundVariants}
      initial="stopped"
      animate={isListening ? "active" : "stopped"}
    >




      
      {/* 🔮 Visualizador de Audio Animado */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full filter blur-[200px] opacity-20"
        animate={{
          scale: isListening ? [1, 1.2, 1] : 1,
          backgroundColor: ["rgba(0, 110, 255, 0.4)", "rgba(170, 0, 255, 0.4)", "rgba(255, 0, 127, 0.4)"]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      ></motion.div>

      {/* 💻 Contenedor principal */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative w-[90%] max-w-4xl h-[70%] max-h-[600px] bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between p-8 text-center"
      >
        <div className="flex-grow flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={translation}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              // ✅ Aplicando las clases de la jerarquía tipográfica para el cuerpo de texto
              className="text-3xl md:text-4xl lg:text-5xl font-normal leading-tight text-white/90 font-sans"
            >
              {translation}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="w-full h-24 flex flex-col justify-center items-center space-y-4">
          <motion.button 
            onClick={isListening ? disconnect : connect}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl transition-all duration-300 ease-in-out focus:outline-none"
            style={buttonStyle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isListening ? "square" : "mic"}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isListening ? <FiSquare /> : <FiMic />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-white/60 text-sm tracking-widest uppercase font-sans font-light"
          >
            {status}
            {isListening && (
              <motion.span
                className="inline-block h-4 w-px bg-white ml-2"
                variants={statusVariants}
                animate="typing"
              />
            )}
          </motion.span>
        </div>
      </motion.div>
    </motion.main>
  );
};

export default App;