// ============================================
// webrtc-jitsi.js - Videollamada WebRTC para Windows
// ============================================

console.log('📞 webrtc-jitsi.js cargado - Versión Windows');

// Configuración
const CONFIG = {
    JITSI_DOMAIN: '8x8.vc',
    DEFAULT_ROOM_NAME: 'proyecto-final-' + Math.random().toString(36).substr(2, 9),
    ROOM_OPTIONS: {
        width: '100%',
        height: 500,
        parentNode: null,
        roomName: null,
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableSimulcast: false
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
            DISABLE_VIDEO_BACKGROUND: false
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

    console.log('📱 Módulo de videollamada inicializado');
});

// =================== FUNCIONES PRINCIPALES ===================

function setupRoomFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    currentRoom = roomParam || CONFIG.DEFAULT_ROOM_NAME;

    console.log(`🔄 Sala configurada: ${currentRoom}`);

    // Actualizar enlace en la página
    updateRoomLink();
}

function updateRoomInfo() {
    const roomInfoEl = document.getElementById('roomInfo');
    const roomLinkEl = document.getElementById('roomLink');

    if (roomInfoEl) {
        roomInfoEl.textContent = `Sala: ${currentRoom}`;
    }

    if (roomLinkEl) {
        roomLinkEl.textContent = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
        roomLinkEl.href = `${window.location.pathname}?room=${currentRoom}`;
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
        container.style.cssText = 'width: 100%; height: 500px;';

        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.parentNode.insertBefore(container, remoteVideo);
            remoteVideo.style.display = 'none';
        } else {
            document.querySelector('.video-section').appendChild(container);
        }
    }

    // Configurar opciones
    const options = {
        ...CONFIG.ROOM_OPTIONS,
        parentNode: container,
        roomName: currentRoom,
        userInfo: {
            displayName: 'Estudiante-' + Math.random().toString(36).substr(2, 4)
        }
    };

    console.log('🚀 Configurando Jitsi Meet...', options);

    try {
        // Inicializar Jitsi Meet
        jitsiApi = new JitsiMeetExternalAPI(CONFIG.JITSI_DOMAIN, options);

        // Registrar eventos
        setupJitsiEvents();

        // Actualizar estadísticas
        callStats.startTime = new Date();
        callStats.isConnected = true;

        // Actualizar UI
        updateCallUI(true);

        console.log('✅ Jitsi Meet inicializado correctamente');
        showMessage('Conectando a la videollamada...', 'info');

    } catch (error) {
        console.error('🔥 Error al inicializar Jitsi:', error);
        showMessage(`Error: ${error.message}`, 'danger');
        jitsiApi = null;
    }
}

function setupJitsiEvents() {
    if (!jitsiApi) return;

    // Evento cuando la API está lista
    jitsiApi.addEventListeners({
        readyToClose: () => {
            console.log('🔴 Jitsi: readyToClose');
            endCall();
        },

        participantJoined: (participant) => {
            console.log('👤 Participante unido:', participant);
            callStats.participants++;
            showMessage('¡Alguien se ha unido a la sala!', 'success');
            updateParticipantsCount();
        },

        participantLeft: (participant) => {
            console.log('👋 Participante salió:', participant);
            callStats.participants = Math.max(0, callStats.participants - 1);
            showMessage('Un participante ha salido', 'warning');
            updateParticipantsCount();
        },

        incomingMessage: (message) => {
            console.log('💬 Mensaje recibido:', message);
        },

        outgoingMessage: (message) => {
            console.log('💬 Mensaje enviado:', message);
        },

        displayNameChange: (payload) => {
            console.log('📝 Nombre cambiado:', payload);
        },

        emailChange: (payload) => {
            console.log('📧 Email cambiado:', payload);
        },

        avatarChanged: (payload) => {
            console.log('🖼️ Avatar cambiado:', payload);
        },

        videoConferenceJoined: (payload) => {
            console.log('✅ Conferencia unida:', payload);
            showMessage('¡Conectado a la videollamada!', 'success');
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
        }
    });
}

function endCall() {
    console.log('🛑 Terminando videollamada...');

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
                title: 'Únete a mi videollamada',
                text: 'Únete a esta sala de videollamada',
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
            showMessage('Enlace copiado al portapapeles', 'success');
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
                showMessage('Enlace copiado al portapapeles', 'success');
            } catch (fallbackErr) {
                console.error('❌ Fallback también falló:', fallbackErr);
                showMessage('No se pudo copiar el enlace', 'danger');
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

// =================== FUNCIONES DE UI ===================

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
    });
}

function updateCallUI(isInCall) {
    // Actualizar botones
    const startBtn = document.querySelector('[data-action="start-call"]');
    const endBtn = document.querySelector('[data-action="end-call"]');

    if (startBtn) startBtn.disabled = isInCall;
    if (endBtn) endBtn.disabled = !isInCall;

    // Actualizar indicadores
    const statusIndicator = document.getElementById('callStatus');
    if (statusIndicator) {
        statusIndicator.textContent = isInCall ? '🟢 En Llamada' : '🔴 Sin Llamada';
        statusIndicator.className = isInCall ? 'status-connected' : 'status-disconnected';
    }

    // Actualizar título
    const callTitle = document.querySelector('.call-title');
    if (callTitle) {
        callTitle.textContent = isInCall ? '📞 En Videollamada' : '📞 Sala de Videollamada';
    }
}

function updateParticipantsCount() {
    const countEl = document.getElementById('participantsCount');
    if (countEl) {
        countEl.textContent = `Participantes: ${callStats.participants + 1}`; // +1 por el usuario local
    }
}

function showCallStats() {
    const now = new Date();
    const callDuration = callStats.startTime ?
        Math.round((now - callStats.startTime) / 1000) : 0;

    const stats = {
        'Sala actual': currentRoom,
        'Estado': callStats.isConnected ? 'Conectado' : 'Desconectado',
        'Duración llamada': `${callDuration} segundos`,
        'Participantes': callStats.participants + 1,
        'Cámara local': localStream ? 'Activada' : 'Desactivada'
    };

    let message = '📊 ESTADÍSTICAS DE VIDEOLAMADA\n';
    message += '==============================\n';
    for (const [key, value] of Object.entries(stats)) {
        message += `${key}: ${value}\n`;
    }

    alert(message);
}

function showMessage(message, type = 'info') {
    console.log(`💬 ${type.toUpperCase()}: ${message}`);

    // Puedes implementar un sistema de notificaciones similar al de dash-player.js
    // Por ahora usamos alert para simplicidad
    const messageEl = document.createElement('div');
    messageEl.className = `call-message call-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1000;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        animation: fadeIn 0.3s ease;
        background: ${type === 'success' ? '#10b981' : 
                     type === 'danger' ? '#ef4444' : 
                     type === 'warning' ? '#f59e0b' : '#3b82f6'};
    `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
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


console.log('✅ webrtc-jitsi.js completamente cargado');
