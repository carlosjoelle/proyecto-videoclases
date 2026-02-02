// ============================================
// webrtc-jitsi.js - Videollamada WebRTC para Windows - VERSIÓN CORREGIDA
// ============================================

console.log('📞 webrtc-jitsi.js cargado - Versión corregida');

// Configuración MEJORADA
const CONFIG = {
    JITSI_DOMAIN: '8x8.vc',
    DEFAULT_ROOM_NAME: 'proyecto-final-' + Math.random().toString(36).substr(2, 9),
    ROOM_OPTIONS: {
        width: '100%',
        height: 500,
        parentNode: null,
        roomName: null,
        configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            disableDeepLinking: true,
            disableInviteFunctions: true,
            enableNoisyMicDetection: false,
            enableClosePage: false,
            prejoinPageEnabled: false,
            constraints: {
                video: {
                    height: {
                        ideal: 720,
                        max: 720,
                        min: 240
                    }
                }
            },
            p2p: {
                enabled: true,
                stunServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'info', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                'security'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            DISABLE_VIDEO_BACKGROUND: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false
        }
    }
};

// Variables globales
let jitsiApi = null;
let localStream = null;
let currentRoom = null;
let callStats = {
    startTime: null,
    participants: 0,
    isConnected: false
};
let participantCheckInterval = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado - Inicializando módulo de videollamada');

    // Configurar sala desde URL o generar una nueva
    setupRoomFromURL();

    // Mostrar información de la sala
    updateRoomInfo();

    // Iniciar cámara local (preview)
    startLocalCamera();

    // Configurar event listeners
    setupEventListeners();

    // Agregar estilos para notificaciones
    addNotificationStyles();

    console.log('📱 Módulo de videollamada inicializado');
});

// =================== FUNCIONES PRINCIPALES ===================

function ensureSameRoom() {
    // Si hay room en URL, usarlo
    const urlParams = new URLSearchParams(window.location.search);
    let roomParam = urlParams.get('room');
    
    if (roomParam) {
        // Ya tiene sala en URL
        currentRoom = roomParam;
    } else {
        // Crear nueva sala y actualizar URL
        const newRoom = CONFIG.DEFAULT_ROOM_NAME;
        const newUrl = `${window.location.pathname}?room=${encodeURIComponent(newRoom)}`;
        window.history.replaceState({}, '', newUrl);
        currentRoom = newRoom;
    }
    
    console.log(`🔄 Sala actual: ${currentRoom}`);
    return currentRoom;
}

function setupRoomFromURL() {
    currentRoom = ensureSameRoom();
    updateRoomLink();
}

function updateRoomInfo() {
    const roomInfoEl = document.getElementById('roomInfo');
    const roomLinkEl = document.getElementById('roomLink');

    if (roomInfoEl) {
        roomInfoEl.textContent = `Sala: ${currentRoom}`;
    }

    if (roomLinkEl) {
        const fullLink = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
        roomLinkEl.textContent = fullLink;
        roomLinkEl.href = fullLink;
    }
}

function updateRoomLink() {
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;

    // Actualizar elemento si existe
    const linkEl = document.getElementById('roomLinkDisplay');
    if (linkEl) {
        linkEl.textContent = roomLink;
        linkEl.href = roomLink;
    }

    // También actualizar en el título si existe
    const titleEl = document.querySelector('.room-title');
    if (titleEl) {
        titleEl.textContent = `Sala: ${currentRoom}`;
    }

    console.log(`🔗 Enlace de sala: ${roomLink}`);
}

function startLocalCamera() {
    console.log('🎥 Iniciando cámara local...');

    const constraints = {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
        },
        audio: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;
            const localVideo = document.getElementById('localVideo');

            if (localVideo) {
                localVideo.srcObject = stream;
                localVideo.muted = true; // Silenciar para evitar eco
                console.log('✅ Cámara local activada');
                showMessage('Cámara local activada correctamente', 'success');
            } else {
                console.warn('⚠️ Elemento localVideo no encontrado');
            }
        })
        .catch(error => {
            console.error('❌ Error al acceder a la cámara:', error);

            let errorMessage = 'No se pudo acceder a la cámara/micrófono. ';

            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage += 'Permiso denegado por el usuario.';
                    break;
                case 'NotFoundError':
                    errorMessage += 'No se encontró cámara/micrófono.';
                    break;
                case 'NotReadableError':
                    errorMessage += 'Cámara/micrófono en uso por otra aplicación.';
                    break;
                default:
                    errorMessage += `Error: ${error.message}`;
            }

            showMessage(errorMessage, 'danger');
        });
}

function startCall() {
    console.log('📞 Iniciando videollamada...');
    console.log('🔍 DEBUG - URL actual:', window.location.href);
    console.log('🔍 DEBUG - Room en URL:', currentRoom);
    console.log('🔍 DEBUG - Jitsi Domain:', CONFIG.JITSI_DOMAIN);

    // Verificar si ya hay una llamada activa
    if (jitsiApi) {
        console.log('⚠️ Ya hay una llamada activa');
        showMessage('Ya hay una llamada en curso', 'warning');
        return;
    }

    // Verificar permisos de cámara
    if (!localStream) {
        console.error('❌ No hay acceso a cámara/micrófono');
        showMessage('Primero permite el acceso a cámara y micrófono', 'danger');
        startLocalCamera(); // Intentar nuevamente
        return;
    }

    // Crear contenedor para Jitsi si no existe
    let container = document.getElementById('jitsiContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'jitsiContainer';
        container.style.cssText = 'width: 100%; height: 500px; background: #000;';

        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.parentNode.insertBefore(container, remoteVideo);
            remoteVideo.style.display = 'none';
        } else {
            document.querySelector('.video-section').appendChild(container);
        }
    }

    // Configurar opciones MEJORADAS
    const options = {
        ...CONFIG.ROOM_OPTIONS,
        parentNode: container,
        roomName: currentRoom,
        userInfo: {
            displayName: 'Estudiante-' + Math.random().toString(36).substr(2, 4)
        }
    };

    console.log('🚀 Configurando Jitsi Meet con opciones:', options);

    try {
        // Inicializar Jitsi Meet
        jitsiApi = new JitsiMeetExternalAPI(CONFIG.JITSI_DOMAIN, options);

        // Crear contador fijo de participantes
        createParticipantCounter();

        // Registrar eventos MEJORADOS
        setupJitsiEvents();

        // Actualizar estadísticas
        callStats.startTime = new Date();
        callStats.isConnected = true;
        callStats.participants = 0; // Resetear contador

        // Configurar intervalo para verificar participantes
        setupParticipantChecker();

        // Actualizar UI
        updateCallUI(true);

        console.log('✅ Jitsi Meet inicializado correctamente');
        showMessage('Conectando a la videollamada... Esperando participantes', 'info');

    } catch (error) {
        console.error('🔥 Error al inicializar Jitsi:', error);
        showMessage(`Error: ${error.message}`, 'danger');
        jitsiApi = null;
    }
}

function setupJitsiEvents() {
    if (!jitsiApi) return;

    // Limpiar eventos anteriores primero
    if (jitsiApi.removeAllListeners) {
        try {
            jitsiApi.removeAllListeners();
        } catch (e) {
            // Ignorar si no se puede remover
        }
    }

    // Eventos CRÍTICOS para ver participantes
    jitsiApi.addEventListeners({
        readyToClose: () => {
            console.log('🔴 Jitsi: readyToClose');
            endCall();
        },

        participantJoined: (participant) => {
            console.log('👤✅ Participante UNIDO:', participant);
            callStats.participants++;
            
            // NOTIFICACIÓN VISIBLE
            showParticipantNotification(`${participant.displayName || 'Alguien'} se ha unido a la sala`, 'join');
            
            // Actualizar contador
            updateParticipantsCount();
            
            // Forzar actualización de UI
            setTimeout(() => {
                if (jitsiApi && jitsiApi.getParticipantsInfo) {
                    try {
                        const participants = jitsiApi.getParticipantsInfo();
                        console.log('📊 Participantes actuales después de unión:', participants);
                        showMessage(`¡Ahora hay ${participants.length + 1} personas en la sala!`, 'success');
                    } catch (e) {
                        console.log('⚠️ No se pudo obtener lista de participantes');
                    }
                }
            }, 1000);
        },

        participantLeft: (participant) => {
            console.log('👋 Participante SALIÓ:', participant);
            callStats.participants = Math.max(0, callStats.participants - 1);
            
            // NOTIFICACIÓN VISIBLE
            showParticipantNotification(`${participant.displayName || 'Alguien'} ha salido de la sala`, 'leave');
            
            updateParticipantsCount();
        },

        // Evento CRÍTICO - Cuando TÚ te unes
        videoConferenceJoined: (payload) => {
            console.log('✅✅ TÚ te has unido a la conferencia:', payload);
            showMessage('¡Conectado a la videollamada! Comparte el enlace para invitar a más personas.', 'success');
            
            // Obtener participantes actuales después de 2 segundos
            setTimeout(() => {
                if (jitsiApi && jitsiApi.getParticipantsInfo) {
                    try {
                        const participants = jitsiApi.getParticipantsInfo();
                        console.log('👥 Participantes en sala después de unirte:', participants);
                        callStats.participants = participants.length;
                        updateParticipantsCount();
                        
                        if (participants.length > 0) {
                            showMessage(`✅ Hay ${participants.length} persona(s) más en la sala`, 'info');
                        } else {
                            showMessage('👤 Eres el primero en la sala. Comparte el enlace!', 'info');
                        }
                    } catch (e) {
                        console.log('⚠️ No se pudo obtener lista inicial de participantes');
                    }
                }
            }, 2000);
        },

        videoConferenceLeft: (payload) => {
            console.log('🚪 Conferencia abandonada:', payload);
            showMessage('Desconectado de la videollamada', 'info');
        },

        audioMuteStatusChanged: (payload) => {
            console.log('🔇 Estado mute audio:', payload);
        },

        videoMuteStatusChanged: (payload) => {
            console.log('📹 Estado mute video:', payload);
        },

        // Evento para depuración
        participantsPaneToggled: (payload) => {
            console.log('📋 Panel de participantes:', payload);
        }
    });
}

function setupParticipantChecker() {
    // Limpiar intervalo anterior si existe
    if (participantCheckInterval) {
        clearInterval(participantCheckInterval);
    }
    
    // Configurar intervalo para verificar participantes cada 3 segundos
    participantCheckInterval = setInterval(() => {
        if (jitsiApi && jitsiApi.getParticipantsInfo) {
            try {
                const participants = jitsiApi.getParticipantsInfo();
                const actualCount = participants.length;
                
                if (actualCount !== callStats.participants) {
                    console.log(`🔄 Actualizando contador: ${actualCount} participantes (antes: ${callStats.participants})`);
                    callStats.participants = actualCount;
                    updateParticipantsCount();
                }
            } catch (e) {
                // Silenciar errores de obtención
            }
        }
    }, 3000);
}

function endCall() {
    console.log('🛑 Terminando videollamada...');

    // Limpiar intervalo de verificación
    if (participantCheckInterval) {
        clearInterval(participantCheckInterval);
        participantCheckInterval = null;
    }

    // Eliminar contador fijo
    const fixedCounter = document.querySelector('.participant-counter');
    if (fixedCounter) {
        fixedCounter.remove();
    }

    if (jitsiApi) {
        try {
            jitsiApi.dispose();
            console.log('✅ Jitsi Meet finalizado');
        } catch (error) {
            console.error('Error al finalizar Jitsi:', error);
        }
        jitsiApi = null;
    }

    // Limpiar contenedor
    const container = document.getElementById('jitsiContainer');
    if (container) {
        container.innerHTML = '';
    }

    // Mostrar video local nuevamente
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
        remoteVideo.style.display = 'block';
    }

    // Actualizar estadísticas
    callStats.isConnected = false;
    callStats.participants = 0;

    // Actualizar UI
    updateCallUI(false);

    showMessage('Videollamada terminada', 'info');
}

function createNewRoom() {
    const roomName = prompt('Ingresa un nombre para la nueva sala:',
        'sala-' + Math.random().toString(36).substr(2, 6));

    if (roomName && roomName.trim() !== '') {
        // Guardar estado actual si hay llamada
        const wasInCall = callStats.isConnected;

        if (wasInCall) {
            endCall();
        }

        // Actualizar sala
        currentRoom = roomName.trim();

        // Actualizar URL sin recargar
        const newUrl = `${window.location.pathname}?room=${encodeURIComponent(currentRoom)}`;
        window.history.pushState({}, '', newUrl);

        // Actualizar UI
        updateRoomInfo();
        updateRoomLink();

        console.log(`🆕 Nueva sala creada: ${currentRoom}`);
        showMessage(`Nueva sala creada: ${currentRoom}`, 'success');

        // Si estaba en llamada, reconectar
        if (wasInCall) {
            setTimeout(() => startCall(), 1000);
        }
    }
}

function shareRoomLink() {
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;

    if (navigator.share) {
        // Web Share API
        navigator.share({
                title: 'Únete a mi videollamada - Proyecto Final',
                text: 'Únete a esta sala de videollamada educativa',
                url: roomLink
            })
            .then(() => console.log('✅ Enlace compartido'))
            .catch(error => {
                console.log('❌ Error al compartir:', error);
                copyToClipboard(roomLink);
            });
    } else {
        // Fallback: copiar al portapapeles
        copyToClipboard(roomLink);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log('✅ Enlace copiado al portapapeles');
            showMessage('✅ Enlace copiado al portapapeles. ¡Pégalo y envíalo!', 'success');
        })
        .catch(err => {
            console.error('❌ Error al copiar:', err);

            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                showMessage('✅ Enlace copiado al portapapeles', 'success');
            } catch (fallbackErr) {
                console.error('❌ Fallback también falló:', fallbackErr);
                showMessage('❌ No se pudo copiar el enlace', 'danger');
            }

            document.body.removeChild(textArea);
        });
}

function toggleCamera() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const status = videoTrack.enabled ? 'activada' : 'desactivada';
            console.log(`📹 Cámara ${status}`);
            showMessage(`Cámara ${status}`, 'info');

            // Actualizar botón
            const camBtn = document.querySelector('[data-action="toggle-camera"]');
            if (camBtn) {
                camBtn.textContent = videoTrack.enabled ? '📹 Apagar Cámara' : '📹 Encender Cámara';
            }
        }
    }
}

function toggleMicrophone() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const status = audioTrack.enabled ? 'activado' : 'desactivado';
            console.log(`🎤 Micrófono ${status}`);
            showMessage(`Micrófono ${status}`, 'info');

            // Actualizar botón
            const micBtn = document.querySelector('[data-action="toggle-microphone"]');
            if (micBtn) {
                micBtn.textContent = audioTrack.enabled ? '🎤 Silenciar Mic' : '🎤 Activar Mic';
            }
        }
    }
}

// =================== FUNCIONES DE UI MEJORADAS ===================

function createParticipantCounter() {
    // Eliminar contador anterior si existe
    const existingCounter = document.querySelector('.participant-counter');
    if (existingCounter) existingCounter.remove();
    
    // Crear nuevo contador
    const counter = document.createElement('div');
    counter.className = 'participant-counter';
    counter.id = 'fixedParticipantCounter';
    counter.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">👥</span>
            <div>
                <div style="font-weight: bold; font-size: 16px;">
                    <span id="participantCount">1</span> persona(s)
                </div>
                <div style="font-size: 10px; opacity: 0.8;">en sala</div>
            </div>
        </div>
    `;
    
    counter.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(33, 150, 243, 0.95);
        color: white;
        padding: 10px 15px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        animation: slideInLeft 0.3s ease;
    `;
    
    document.body.appendChild(counter);
    
    return counter;
}

function updateParticipantsCount() {
    const totalParticipants = callStats.participants + 1; // +1 por el usuario local
    
    // Actualizar contador en el header si existe
    const countEl = document.getElementById('participantsCount');
    if (countEl) {
        countEl.innerHTML = `<strong>👥 ${totalParticipants} persona(s)</strong>`;
    }
    
    // Actualizar contador fijo
    const fixedCount = document.getElementById('participantCount');
    if (fixedCount) {
        fixedCount.textContent = totalParticipants;
    }
    
    // Actualizar título de la sala si existe
    const roomTitle = document.querySelector('.room-title');
    if (roomTitle) {
        roomTitle.innerHTML = `Sala: ${currentRoom} <small>(${totalParticipants} personas)</small>`;
    }
    
    console.log(`👥 Total participantes actualizado: ${totalParticipants}`);
}

function showCurrentParticipants() {
    if (!jitsiApi) {
        showMessage('❌ No hay llamada activa', 'danger');
        return;
    }
    
    try {
        const participants = jitsiApi.getParticipantsInfo();
        let message = '👥 **PARTICIPANTES EN LA SALA**\n\n';
        message += `• Tú (${jitsiApi.getDisplayName() || 'Anónimo'})\n`;
        
        if (participants.length === 0) {
            message += '\n⚠️ No hay otras personas en la sala todavía.\n';
            message += '📤 Comparte el enlace para invitar a alguien.';
        } else {
            participants.forEach((p, i) => {
                message += `• ${p.displayName || 'Participante ' + (i+1)}\n`;
            });
            message += `\n✅ **Total: ${participants.length + 1} persona(s)**`;
        }
        
        // Crear modal bonito
        showParticipantModal(message);
        
    } catch (error) {
        console.error('Error al obtener participantes:', error);
        showMessage('⚠️ No se pudo obtener la lista de participantes', 'warning');
    }
}

function showParticipantModal(content) {
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'participantsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            ">
                <h2 style="margin: 0; color: #333; display: flex; align-items: center; gap: 10px;">
                    <span>👥</span> Participantes
                </h2>
                <button onclick="closeModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    transition: color 0.3s;
                " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#666'">×</button>
            </div>
            <div style="white-space: pre-line; line-height: 1.6; color: #333; padding: 10px;">
                ${content}
            </div>
            <div style="margin-top: 25px; text-align: center;">
                <button onclick="closeModal()" style="
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                    transition: background 0.3s;
                " onmouseover="this.style.background='#0b7dda'" onmouseout="this.style.background='#2196F3'">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('participantsModal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = '';
}

function setupEventListeners() {
    // Botones principales
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="start-call"]') || e.target.closest('[data-action="start-call"]')) {
            startCall();
        }
        if (e.target.matches('[data-action="end-call"]') || e.target.closest('[data-action="end-call"]')) {
            endCall();
        }
        if (e.target.matches('[data-action="create-room"]') || e.target.closest('[data-action="create-room"]')) {
            createNewRoom();
        }
        if (e.target.matches('[data-action="share-link"]') || e.target.closest('[data-action="share-link"]')) {
            shareRoomLink();
        }
        if (e.target.matches('[data-action="toggle-camera"]') || e.target.closest('[data-action="toggle-camera"]')) {
            toggleCamera();
        }
        if (e.target.matches('[data-action="toggle-microphone"]') || e.target.closest('[data-action="toggle-microphone"]')) {
            toggleMicrophone();
        }
        if (e.target.matches('[data-action="show-stats"]') || e.target.closest('[data-action="show-stats"]')) {
            showCallStats();
        }
        if (e.target.matches('[data-action="show-participants"]') || e.target.closest('[data-action="show-participants"]')) {
            showCurrentParticipants();
        }
    });
}

function updateCallUI(isInCall) {
    // Actualizar botones
    const startBtn = document.querySelector('[data-action="start-call"]');
    const endBtn = document.querySelector('[data-action="end-call"]');

    if (startBtn) {
        startBtn.disabled = isInCall;
        startBtn.style.opacity = isInCall ? '0.6' : '1';
    }
    if (endBtn) {
        endBtn.disabled = !isInCall;
        endBtn.style.opacity = !isInCall ? '0.6' : '1';
    }

    // Actualizar indicadores
    const statusIndicator = document.getElementById('callStatus');
    if (statusIndicator) {
        if (isInCall) {
            statusIndicator.innerHTML = '<div style="display: flex; align-items: center; gap: 8px;"><div style="width: 12px; height: 12px; background: #10B981; border-radius: 50%; animation: pulse 2s infinite;"></div><span>🟢 En Llamada</span></div>';
            statusIndicator.className = 'status-connected';
        } else {
            statusIndicator.innerHTML = '<div style="display: flex; align-items: center; gap: 8px;"><div style="width: 12px; height: 12px; background: #EF4444; border-radius: 50%;"></div><span>🔴 Sin Llamada</span></div>';
            statusIndicator.className = 'status-disconnected';
        }
    }

    // Actualizar título
    const callTitle = document.querySelector('.call-title');
    if (callTitle) {
        callTitle.textContent = isInCall ? '📞 En Videollamada' : '📞 Sala de Videollamada';
    }
}

function showCallStats() {
    const now = new Date();
    const callDuration = callStats.startTime ?
        Math.round((now - callStats.startTime) / 1000) : 0;

    const stats = {
        'Sala actual': currentRoom,
        'Estado': callStats.isConnected ? '🟢 Conectado' : '🔴 Desconectado',
        'Duración llamada': `${callDuration} segundos`,
        'Participantes actuales': `${callStats.participants + 1} persona(s)`,
        'Cámara local': localStream ? '✅ Activada' : '❌ Desactivada',
        'Micrófono local': localStream && localStream.getAudioTracks()[0]?.enabled ? '✅ Activado' : '❌ Desactivado'
    };

    let message = '📊 **ESTADÍSTICAS DE VIDEOLAMADA**\n';
    message += '================================\n\n';
    for (const [key, value] of Object.entries(stats)) {
        message += `**${key}:** ${value}\n`;
    }
    
    // Crear modal para estadísticas
    const modal = document.createElement('div');
    modal.id = 'statsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            ">
                <h2 style="margin: 0; color: #333; display: flex; align-items: center; gap: 10px;">
                    <span>📊</span> Estadísticas
                </h2>
                <button onclick="this.parentNode.parentNode.parentNode.remove(); document.body.style.overflow='';" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
            </div>
            <div style="white-space: pre-line; line-height: 1.8; color: #333; font-family: monospace;">
                ${message}
            </div>
            <div style="margin-top: 25px; text-align: center;">
                <button onclick="this.parentNode.parentNode.parentNode.remove(); document.body.style.overflow='';" style="
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                ">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// =================== FUNCIONES DE NOTIFICACIÓN ===================

function showParticipantNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `participant-notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 28px;">${type === 'join' ? '👤✅' : '👋'}</span>
            <div>
                <strong style="font-size: 14px;">${message}</strong>
                <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                    ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'join' ? 'rgba(76, 175, 80, 0.95)' : 'rgba(255, 152, 0, 0.95)'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function showMessage(message, type = 'info') {
    console.log(`💬 ${type.toUpperCase()}: ${message}`);

    const messageEl = document.createElement('div');
    messageEl.className = `call-message call-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        animation: slideInRight 0.3s ease;
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                     type === 'danger' ? 'rgba(239, 68, 68, 0.95)' : 
                     type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(59, 130, 246, 0.95)'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        max-width: 400px;
    `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 4000);
}

function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes slideInLeft {
            from {
                transform: translateX(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .status-connected {
            color: #10B981;
        }
        
        .status-disconnected {
            color: #EF4444;
        }
    `;
    document.head.appendChild(style);
}

// =================== INICIALIZACIÓN GLOBAL ===================

// Hacer funciones disponibles globalmente
window.startCall = startCall;
window.endCall = endCall;
window.createNewRoom = createNewRoom;
window.shareRoomLink = shareRoomLink;
window.toggleCamera = toggleCamera;
window.toggleMicrophone = toggleMicrophone;
window.showCallStats = showCallStats;
window.showCurrentParticipants = showCurrentParticipants;
window.closeModal = closeModal;

console.log('✅ webrtc-jitsi.js completamente cargado - Versión corregida');
