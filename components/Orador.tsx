import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";

const Orador: React.FC = () => {
  const [status, setStatus] = useState('Detenido');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // Valor entre 0 y 1 para el vúmetro
  const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioSourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNode = useRef<AudioWorkletNode | null>(null);
  const rafId = useRef<number | null>(null);

  // Funciones declaradas primero
  const stopAudioStream = () => {
    console.log("Deteniendo stream de audio.");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setAudioLevel(0);
  };

  const stopRecording = async () => {
    console.log("Deteniendo grabación.");
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
      setSilenceTimeout(null);
    }
    if (isRecording) {
      if (audioSourceNode.current) {
        audioSourceNode.current.disconnect();
      }
      if (audioWorkletNode.current) {
        audioWorkletNode.current.disconnect();
      }
      if (ws.current) {
        ws.current.close();
      }
      setIsRecording(false);
      setStatus('Detenido');
      stopAudioStream(); // Asegura la limpieza del stream
    }

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/configure`, {
        method: 'POST',
        body: new URLSearchParams({
          'action': 'stop'
        })
      });
      console.log("Servicio detenido en el backend.");
    } catch (error) {
      console.error("Error al detener el servicio en el backend:", error);
    }
  };

  useEffect(() => {
    return () => {
      console.log("Desmontando componente... Cerrando conexiones.");
      if (ws.current) {
        ws.current.close();
      }
      stopAudioStream();
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }
    };
  }, []);

  const startRecording = async () => {
    console.log("Intentando iniciar el servicio de grabación.");
    setStatus('Conectando...');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/configure`, {
        method: 'POST',
        body: new URLSearchParams({
          'action': 'start',
          'input_lang': 'en-US',
          'storage_method': 'NO_RECORD'
        })
      });

      if (response.ok) {
        console.log("Servicio iniciado en el backend. Intentando conexión WebSocket.");
        const wsUrl = `${import.meta.env.VITE_API_URL}/ws/speaker`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log("WebSocket: Conexión establecida. Iniciando stream de audio...");
          setStatus('Activo');
          setIsRecording(true);
          startAudioStream();
        };

        ws.current.onerror = (event) => {
          console.error("WebSocket: Error en la conexión:", event);
          setStatus('Error de conexión');
          setIsRecording(false);
          stopRecording();
        };

        ws.current.onclose = () => {
          console.log("WebSocket: Conexión cerrada.");
          setStatus('Desconectado');
          setIsRecording(false);
          stopAudioStream();
        };
      } else {
        console.error("Error al iniciar el servicio en el backend.");
        setStatus("Error de servidor");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setStatus("Error de servidor");
    }
  };

  const startAudioStream = async () => {
    console.log("Intentando iniciar el stream de audio del micrófono.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log("Micrófono: Permiso concedido. Stream de audio obtenido.");

      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      console.log("AudioContext creado. Cargando módulo de AudioWorklet...");
      await audioContext.current.audioWorklet.addModule('/audio-processor.js');
      console.log("AudioWorklet: Módulo cargado con éxito.");

      audioSourceNode.current = audioContext.current.createMediaStreamSource(stream);
      audioWorkletNode.current = new AudioWorkletNode(audioContext.current, 'audio-processor');

      let currentVolume = 0;
      const smoothFactor = 0.8;
      const silenceThreshold = 0.01; // Nivel bajo considerado silencio
      const silenceDuration = 5000; // 5 segundos en ms

      audioWorkletNode.current.port.onmessage = (event) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          const audioData = event.data;
          const int16Array = float32ToInt16(audioData);
          ws.current.send(int16Array.buffer);

          // Cálculo del RMS para el vúmetro
          let sumOfSquares = 0;
          for (let i = 0; i < audioData.length; i++) {
            sumOfSquares += audioData[i] * audioData[i];
          }
          const rms = Math.sqrt(sumOfSquares / audioData.length);
          currentVolume = Math.max(rms, currentVolume * smoothFactor);

          // Lógica para la detección de silencio
          if (currentVolume < silenceThreshold && status === 'Grabando y transmitiendo...') {
            if (!silenceTimeout) {
              setSilenceTimeout(setTimeout(() => {
                setStatus('Esperando tu voz...');
                // Aquí podrías enviar una señal al backend para pausar el procesamiento
              }, silenceDuration));
            }
          } else if (currentVolume >= silenceThreshold) {
            if (silenceTimeout) {
              clearTimeout(silenceTimeout);
              setSilenceTimeout(null);
              if (status === 'Esperando tu voz...') {
                setStatus('Grabando y transmitiendo...');
              }
            }
          }
        }
      };

      // Bucle para actualizar la UI del vúmetro eficientemente
      const updateVumeter = () => {
        setAudioLevel(currentVolume);
        rafId.current = requestAnimationFrame(updateVumeter);
      };
      rafId.current = requestAnimationFrame(updateVumeter);


      audioSourceNode.current.connect(audioWorkletNode.current);
      audioWorkletNode.current.connect(audioContext.current.destination);
      setStatus('Grabando y transmitiendo...');
      console.log("Stream de audio iniciado y conectado a AudioWorkletNode.");

    } catch (error) {
      console.error("Error al procesar el audio (en startAudioStream):", error);
      setStatus('Error en el procesamiento de audio. Verifica los permisos del micrófono.');
      setIsRecording(false);
      if (ws.current) {
        ws.current.close();
      }
    }
  };

  const float32ToInt16 = (buffer: Float32Array): Int16Array => {
    let l = buffer.length;
    let buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7fff;
    }
    return buf;
  };

  const getStatusDotColor = () => {
    if (status === 'Activo' || status === 'Grabando y transmitiendo...') {
      return 'green';
    }
    if (status === 'Esperando tu voz...') {
      return 'orange'; // Nuevo estado para indicar silencio
    }
    return 'red';
  };

  const getMicIconStyle = () => {
    // Escala el audioLevel de 0-1 a 1-1.3 para un efecto de pulso
    const scale = 1 + audioLevel * 0.3;
    const color = audioLevel > 0.15 ? '#4CAF50' : '#E0E0E0'; // Color del micrófono
    return {
      transform: `scale(${scale})`,
      color: color,
      transition: 'transform 0.1s ease-out, color 0.3s ease-in-out'
    };
  };

  const getDialStyle = () => {
    const angle = audioLevel * 180; // Mapea el nivel de 0-1 a un ángulo de 0-180 grados
    return {
      transform: `rotate(${angle - 90}deg)`, // Ajusta para que 0 esté abajo a la izquierda
    };
  };


  return (
    <div className="lt-container">
      <h1 className="lt-title">🗣️ Modo Orador</h1>
      <p className="lt-subtitle">Comienza a hablar y tu voz se traducirá en tiempo real.</p>

      <div className="lt-controls">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`lt-btn ${isRecording ? 'stop' : 'start'}`}
        >
          {isRecording ? 'Detener Transmisión' : 'Iniciar Transmisión'}
        </button>
      </div>

      <div className="status-section">
        <div className="status-indicator">
          <div className="lt-status-dot" style={{ backgroundColor: getStatusDotColor() }}></div>
          <p><strong>Estado:</strong> {status}</p>
        </div>
        <div className="mic-feedback">
          <div className="mic-icon" style={getMicIconStyle()}>
            <i className="fas fa-microphone"></i>
          </div>
          {status === 'Grabando y transmitiendo...' && audioLevel < 0.05 && (
            <p className="status-message">¡Habla un poco más fuerte!</p>
          )}
          {status === 'Esperando tu voz...' && (
            <p className="status-message">Esperando tu voz...</p>
          )}
        </div>
      </div>

      {/* Vúmetro estilo vintage */}
      <div className="vumeter-vintage-container">
        <div className="vumeter-dial">
          <div className="vumeter-needle" style={getDialStyle()}></div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Link to="/" className="lt-btn audio-off">Volver</Link>
      </div>
    </div>
  );
};

export default Orador;