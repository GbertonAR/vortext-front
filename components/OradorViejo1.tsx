import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";

const Orador: React.FC = () => {
  const [status, setStatus] = useState('Detenido');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [roomId, setRoomId] = useState('Sala1');
  const [inputLang, setInputLang] = useState('en-US');

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioSourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNode = useRef<AudioWorkletNode | null>(null);
  const rafId = useRef<number | null>(null);

  const stopAudioStream = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContext.current) { audioContext.current.close(); audioContext.current = null; }
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    setAudioLevel(0);
  };

  const stopRecording = async () => {
    if (silenceTimeout) { clearTimeout(silenceTimeout); setSilenceTimeout(null); }
    if (isRecording) {
      if (audioSourceNode.current) audioSourceNode.current.disconnect();
      if (audioWorkletNode.current) audioWorkletNode.current.disconnect();
      if (ws.current) ws.current.close();
      setIsRecording(false);
      setStatus('Detenido');
      stopAudioStream();
    }
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/configure/${roomId}`, {
        method: 'POST',
        body: new URLSearchParams({ 'action': 'stop', 'input_lang': inputLang, 'storage_method': 'NO_RECORD' })
      });
    } catch (error) { console.error("Error al detener el servicio en el backend:", error); }
  };

  useEffect(() => {
    return () => { 
      if (ws.current) ws.current.close();
      stopAudioStream();
      if (silenceTimeout) clearTimeout(silenceTimeout);
    };
  }, []);

  const startRecording = async () => {
    setStatus('Conectando...');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/configure/${roomId}`, {
        method: 'POST',
        body: new URLSearchParams({ 'action': 'start', 'input_lang': inputLang, 'storage_method': 'NO_RECORD' })
      });
      if (!response.ok) { setStatus("Error de servidor"); return; }

      const wsUrl = `${import.meta.env.VITE_API_URL}/ws/speaker/${roomId}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => { setStatus('Grabando y transmitiendo...'); setIsRecording(true); startAudioStream(); };
      ws.current.onerror = (event) => { console.error(event); setStatus('Error de conexión'); stopRecording(); };
      ws.current.onclose = () => { setStatus('Desconectado'); setIsRecording(false); stopAudioStream(); };

    } catch (error) { console.error(error); setStatus("Error de servidor"); }
  };

  const startAudioStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      await audioContext.current.audioWorklet.addModule('/audio-processor.js');

      audioSourceNode.current = audioContext.current.createMediaStreamSource(stream);
      audioWorkletNode.current = new AudioWorkletNode(audioContext.current, 'audio-processor');

      let currentVolume = 0;
      const smoothFactor = 0.8;
      const silenceThreshold = 0.01;
      const silenceDuration = 5000;

      audioWorkletNode.current.port.onmessage = (event) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          const audioData = event.data;
          ws.current.send(float32ToInt16(audioData).buffer);

          let sum = 0;
          for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
          const rms = Math.sqrt(sum / audioData.length);
          currentVolume = Math.max(rms, currentVolume * smoothFactor);

          if (currentVolume < silenceThreshold && status === 'Grabando y transmitiendo...') {
            if (!silenceTimeout) {
              setSilenceTimeout(setTimeout(() => setStatus('Esperando tu voz...'), silenceDuration));
            }
          } else if (currentVolume >= silenceThreshold) {
            if (silenceTimeout) { clearTimeout(silenceTimeout); setSilenceTimeout(null); if (status === 'Esperando tu voz...') setStatus('Grabando y transmitiendo...'); }
          }
        }
      };

      const updateVumeter = () => { setAudioLevel(currentVolume); rafId.current = requestAnimationFrame(updateVumeter); };
      rafId.current = requestAnimationFrame(updateVumeter);

      audioSourceNode.current.connect(audioWorkletNode.current);
      audioWorkletNode.current.connect(audioContext.current.destination);

    } catch (error) { console.error(error); setStatus('Error en el procesamiento de audio'); if (ws.current) ws.current.close(); }
  };

  const float32ToInt16 = (buffer: Float32Array) => { let l = buffer.length; let buf = new Int16Array(l); while (l--) buf[l] = Math.min(1, buffer[l]) * 0x7fff; return buf; };

  const getStatusDotColor = () => {
    if (status === 'Grabando y transmitiendo...') return 'green';
    if (status === 'Esperando tu voz...') return 'orange';
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
      <h1 className="lt-title">🗣️ Modo Orador - Multi-Sala</h1>

      <label>Sala:</label>
      <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} />

      <label>Idioma:</label>
      <select value={inputLang} onChange={e => setInputLang(e.target.value)}>
        <option value="es-ES">Español</option>
        <option value="en-US">Inglés</option>
        <option value="fr-FR">Francés</option>
        <option value="it-IT">Italiano</option>
        <option value="de-DE">Alemán</option>
        <option value="pt-PT">Portugués</option>
        <option value="zh-CN">Chino</option>
      </select>

      <div className="lt-controls">
        <button onClick={isRecording ? stopRecording : startRecording} className={`lt-btn ${isRecording ? 'stop' : 'start'}`}>
          {isRecording ? 'Detener Transmisión' : 'Iniciar Transmisión'}
        </button>
      </div>

      <div className="status-section">
        <div className="status-indicator">
          <div className="lt-status-dot" style={{ backgroundColor: getStatusDotColor() }}></div>
          <p><strong>Estado:</strong> {status}</p>
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
