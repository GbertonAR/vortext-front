import React, { useState, useEffect, useRef } from 'react';

const LiveTranslation = () => {
  const [status, setStatus] = useState('Detenido');
  const [translation, setTranslation] = useState('No hay traducciones aún.');
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // ✅ URL del WebSocket corregida para apuntar al backend en el puerto 8000
  const wsUrl = `ws://${window.location.hostname}:8000/ws/live`;

  useEffect(() => {
    console.log('✅ Componente montado. Preparando limpieza...');
    // Función de limpieza para cerrar el WebSocket al desmontar el componente
    return () => {
      console.log('⚠️ Componente desmontándose. Cerrando WebSocket...');
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocketAndStart = () => {
    console.log('🚀 connectWebSocketAndStart() llamada.');
    // Si la conexión ya está abierta, solo envía el comando de inicio.
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Ya existe una conexión activa (READYSTATE: OPEN). Enviando comando de inicio...");
      wsRef.current.send("start_translation");
      return;
    }
    
    if (wsRef.current) {
      console.log(`⚠️ Conexión existe pero no está abierta. Estado actual: ${wsRef.current.readyState}`);
    }

    console.log("⏳ Creando nuevo WebSocket en URL:", wsUrl);
    const ws = new WebSocket(wsUrl);

    // Esta es la corrección crucial: el comando se envía en el onopen
    ws.onopen = () => {
      console.log("✅ Conexión WebSocket Abierta. ReadyState: ", ws.readyState);
      console.log("➡️ Enviando comando: start_translation");
      ws.send("start_translation");
      setStatus("Activo");
    };

    ws.onmessage = (event) => {
      console.log("📥 Mensaje recibido del servidor.");
      try {
        const data = JSON.parse(event.data);
        console.log("📦 Datos parseados:", data);
        
        // Actualiza el estado del semáforo y del texto
        if (data.status) {
          console.log("🔄 Actualizando estado a:", data.status);
          setStatus(data.status);
        }
        
        // Actualiza la traducción y la reproduce si hay texto y audio
        if (data.text) {
          console.log("📝 Traducción recibida. Intentando actualizar el estado...");
          setTranslation(data.text);
          console.log("Estado de traducción actualizado.");
        }
        
        if (data.audio && data.audio.length > 0) {
          console.log("🎵 Datos de audio recibidos. Tamaño:", data.audio.length);
          const audioBlob = new Blob([new Uint8Array(data.audio)], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          audioQueueRef.current.push(audioUrl);
          if (!isPlayingRef.current) {
            console.log("▶️ Reproduciendo audio en cola...");
            playNextAudio();
          }
        }
      } catch (e) {
        console.error("❌ Error al parsear el mensaje del WebSocket:", e);
        console.error("Mensaje crudo:", event.data);
      }
    };

    ws.onclose = (event) => {
      console.log(`⚠️ Conexión WebSocket cerrada. Código: ${event.code}, Razón: ${event.reason}`);
      setStatus('Desconectado');
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("❌ Error en WebSocket:", error);
      setStatus('Error');
    };

    wsRef.current = ws;
  };

  // const playNextAudio = () => {
  //   if (audioQueueRef.current.length > 0) {
  //     isPlayingRef.current = true;
  //     const audioUrl = audioQueueRef.current.shift();
  //     const audio = new Audio(audioUrl);
  //     console.log("🎵 Reproduciendo audio desde URL:", audioUrl);

  //     audio.onended = () => {
  //       console.log("🎵 Audio terminado. Liberando URL...");
  //       URL.revokeObjectURL(audioUrl);
  //       playNextAudio();
  //     };

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


  const stopTranslation = () => {
    console.log("🛑 stopTranslation() llamada.");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("➡️ Enviando comando de parada: stop_translation");
      wsRef.current.send("stop_translation");
    } else {
      console.log("⚠️ No se puede enviar el comando. WebSocket no está abierto.");
    }
  };

  const getStatusDotColor = () => {
    if (status === 'Activo' || status === 'Traduciendo' || status === 'Enviando') {
      return 'green';
    }
    return 'red';
  };

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <h1>🌐 Traducción en Vivo</h1>
      <p>Controla la traducción desde los botones.</p>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <div style={{ height: '20px', width: '20px', borderRadius: '50%', backgroundColor: getStatusDotColor(), marginRight: '10px' }}></div>
        <p><strong>Estado:</strong> <span>{status}</span></p>
      </div>
      
      <div>
        {status === 'Detenido' || status === 'Desconectado' || status === 'Error' ? (
          <button onClick={connectWebSocketAndStart} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#2ecc71', color: 'white' }}>
            Iniciar Traducción
          </button>
        ) : (
          <button onClick={stopTranslation} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#e74c3c', color: 'white' }}>
            Terminar Traducción
          </button>
        )}
      </div>
      
      <div style={{
        marginTop: '1.5rem', padding: '1rem', border: '1px solid #ddd',
        borderRadius: '8px', minHeight: '100px', textAlign: 'left',
        backgroundColor: '#f9f9f9', whiteSpace: 'pre-wrap'
      }}>
        {translation}
      </div>
    </div>
  );
};

export default LiveTranslation;