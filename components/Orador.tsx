// src/components/Orador.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";

const Orador: React.FC = () => {
  const [status, setStatus] = useState('Detenido');
  const [isRecording, setIsRecording] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reemplaza con tu URL de WebSocket en Azure
  const wsUrl = `wss://tu-azure-app-service.azurewebsites.net/ws/speaker`;

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startRecording = async () => {
    setStatus('Conectando...');
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setStatus('Activo');
        setIsRecording(true);
      };

      ws.current.onerror = (event) => {
        console.error("Error en WebSocket:", event);
        setStatus('Error');
        setIsRecording(false);
      };

      ws.current.onclose = () => {
        setStatus('Desconectado');
        setIsRecording(false);
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(event.data);
        }
      };

      mediaRecorder.current.start(250);
      setStatus('Grabando y transmitiendo...');
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      setStatus('Permiso denegado.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.ondataavailable = null;
      streamRef.current?.getTracks().forEach(track => track.stop());
      ws.current?.close();
      setIsRecording(false);
      setStatus('Detenido');
    }
  };

  const getStatusDotColor = () => {
    if (status === 'Activo' || status === 'Grabando y transmitiendo...') {
      return 'green';
    }
    return 'red';
  };

  return (
    <div className="lt-container">
      <h1 className="lt-title">🗣️ Modo Orador</h1>
      <p className="lt-subtitle">Comienza a hablar y tu voz se traducirá en tiempo real.</p>

      <div className="lt-status">
        <div className="lt-status-dot" style={{ backgroundColor: getStatusDotColor() }}></div>
        <p><strong>Estado:</strong> {status}</p>
      </div>

      <div className="lt-controls">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`lt-btn ${isRecording ? 'stop' : 'start'}`}
        >
          {isRecording ? 'Detener Transmisión' : 'Iniciar Transmisión'}
        </button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <Link to="/" className="lt-btn audio-off">Volver</Link>
      </div>
    </div>
  );
};

export default Orador;