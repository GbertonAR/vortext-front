import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../src/App.css";

const Orador: React.FC = () => {
  const [status, setStatus] = useState('Detenido');
  const [isRecording, setIsRecording] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioSourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNode = useRef<AudioWorkletNode | null>(null);

  // Funciones declaradas primero para evitar ReferenceError
  const stopAudioStream = () => {
    console.log("Deteniendo stream de audio.");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
  };

  const stopRecording = async () => {
    console.log("Deteniendo grabación.");
    if (isRecording) {
      if (audioSourceNode.current) {
        audioSourceNode.current.disconnect();
      }
      if (audioWorkletNode.current) {
        audioWorkletNode.current.disconnect();
      }
      if (audioContext.current) {
        await audioContext.current.close();
        audioContext.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (ws.current) {
        ws.current.close();
      }
      setIsRecording(false);
      setStatus('Detenido');
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
      if (audioContext.current) {
        audioContext.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
            // const wsUrl = `ws://127.0.0.1:8000/ws/speaker`;
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

      audioWorkletNode.current.port.onmessage = (event) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          const audioData = event.data;
          const int16Array = float32ToInt16(audioData);
          ws.current.send(int16Array.buffer);
        }
      };

      audioSourceNode.current.connect(audioWorkletNode.current);
      audioWorkletNode.current.connect(audioContext.current.destination);
      setStatus('Grabando y transmitiendo...');
      console.log("Stream de audio iniciado y conectado a AudioWorkletNode.");

    } catch (error) {
      console.error("Error al procesar el audio (en startAudioStream):", error);
      setStatus('Error en el procesamiento de audio.');
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