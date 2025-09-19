// components/Orador.tsx
import React, { useState, useRef } from 'react';

const Orador: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Esperando para iniciar...');
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    setStatus('Conectando al backend...');
    try {
      // Conectar al WebSocket del orador en el backend
      ws.current = new WebSocket('ws://localhost:8000/ws/speaker');

      ws.current.onopen = () => {
        setStatus('Conectado. Preparando micrófono...');
        setIsRecording(true);
      };

      ws.current.onerror = (event) => {
        console.error("Error en WebSocket:", event);
        setStatus('Error de conexión. Revisa el backend.');
        setIsRecording(false);
      };

      ws.current.onclose = () => {
        console.log('Desconectado del WebSocket.');
        setStatus('Desconectado del backend.');
        setIsRecording(false);
      };

      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Iniciar MediaRecorder para capturar el audio en chunks
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
          // Enviar los chunks de audio al backend
          ws.current.send(event.data);
          console.log('Enviando chunk de audio:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.current.start(250); // Enviar datos cada 250ms
      setStatus('Grabando y transmitiendo en vivo...');
      console.log('Grabación iniciada.');

    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      setStatus('Permiso del micrófono denegado o error.');
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
      setStatus('Grabación detenida.');
      console.log('Grabación detenida.');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Modo Orador 🗣️</h1>
      <p style={{ fontSize: '1.2em' }}>Estado: {status}</p>
      <div style={{ marginTop: '30px' }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', marginRight: '10px' }}
        >
          {isRecording ? 'Grabando...' : 'Iniciar Transmisión'}
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none' }}
        >
          Detener
        </button>
      </div>
    </div>
  );
};

export default Orador;