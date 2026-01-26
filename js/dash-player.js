// ============================================
// dash-player.js - RUTA CORREGIDA: videos/videodash1/
// ============================================

console.log('🎬 dash-player.js - Video en videos/videodash1/');

// LISTA DE VIDEOS - RUTA CORRECTA
const VIDEOS = [{
        id: "mi_video",
        name: "🎬 MI VIDEO PROPIO",
        url: "videos/videodash1/manifest.mpd", // ← RUTA CORREGIDA
        description: "Video convertido con MP4Box"
    },
    {
        id: "demo1",
        name: "📚 Demo Educativa",
        url: "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd",
        description: "Video demo público DASH"
    },
    {
        id: "demo2",
        name: "🎥 Big Buck Bunny",
        url: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",
        description: "Animación 3D - Creative Commons"
    }
];

// Variables globales
let dashPlayer = null;
let currentVideoIndex = 0; // Tu video primero

// Inicialización SIMPLIFICADA pero FUNCIONAL
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado');
    console.log('📁 Ruta del video:', VIDEOS[0].url);

    initializeSimplePlayer();
});

// =================== FUNCIÓN SIMPLIFICADA PERO SEGURA ===================

function initializeSimplePlayer() {
    try {
        const videoElement = document.getElementById('videoPlayer');

        if (!videoElement) {
            alert('Error: No se encontró el elemento video');
            return;
        }

        if (typeof dashjs === 'undefined') {
            alert('Error: dash.js no se cargó');
            return;
        }

        console.log('🚀 Iniciando reproductor...');

        // 1. Crear reproductor de forma SEGURA
        dashPlayer = dashjs.MediaPlayer().create();

        // 2. Configurar eventos básicos
        dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function() {
            console.log('✅ Stream inicializado');
            alert('✅ Video cargado correctamente! Haz clic en play');
        });

        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, function(e) {
            console.error('❌ Error:', e);
            if (e.error && e.error.message) {
                alert('Error: ' + e.error.message);
            }
        });

        dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, function() {
            console.log('▶️ Reproduciendo');
        });

        // 3. Inicializar con tu video
        const initialVideo = VIDEOS[currentVideoIndex];
        console.log('📹 Cargando:', initialVideo.name);
        console.log('🔗 URL:', initialVideo.url);

        dashPlayer.initialize(videoElement, initialVideo.url, true);

        // 4. Configurar selector de video
        setupSimpleVideoSelector();

        console.log('✅ Reproductor listo');

    } catch (error) {
        console.error('🔥 Error crítico:', error);
        alert('Error crítico: ' + error.message);
    }
}

function setupSimpleVideoSelector() {
    const select = document.getElementById('videoSelect');
    if (!select) {
        console.warn('⚠️ No se encontró videoSelect');
        return;
    }

    // Limpiar y agregar opciones
    select.innerHTML = '';

    VIDEOS.forEach((video, index) => {
        const option = document.createElement('option');
        option.value = video.url;
        option.textContent = video.name;
        if (index === currentVideoIndex) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    console.log(`✅ Selector configurado con ${VIDEOS.length} videos`);

    // Evento para cambiar video
    select.addEventListener('change', function() {
        changeSimpleVideo();
    });
}

function changeSimpleVideo() {
    const select = document.getElementById('videoSelect');
    if (!select || !dashPlayer) {
        alert('Reproductor no disponible');
        return;
    }

    const newUrl = select.value;
    const videoName = select.options[select.selectedIndex].text;

    console.log('🔄 Cambiando a:', videoName);
    console.log('🔗 Nueva URL:', newUrl);

    try {
        // Actualizar índice actual
        currentVideoIndex = select.selectedIndex;

        // Cambiar el video
        dashPlayer.attachSource(newUrl);

        // Actualizar título
        const titleElement = document.querySelector('.video-title');
        if (titleElement) {
            titleElement.textContent = videoName.replace(/^[^\w\s]+\s*/, '');
        }

        alert('✅ Cambiando a: ' + videoName);

    } catch (error) {
        console.error('❌ Error al cambiar video:', error);
        alert('Error al cambiar video: ' + error.message);
    }
}

// =================== FUNCIONES DE CONTROL SIMPLES ===================

function playVideo() {
    try {
        const video = document.getElementById('videoPlayer');
        if (video) {
            video.play().then(() => {
                console.log('▶️ Reproduciendo');
                alert('▶️ Reproduciendo video');
            }).catch(e => {
                console.error('Error play:', e);
                alert('Haz clic en el botón de play del video primero');
            });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    }
}

function pauseVideo() {
    const video = document.getElementById('videoPlayer');
    if (video) {
        video.pause();
        console.log('⏸️ Pausado');
    }
}

function showQualityInfo() {
    if (!dashPlayer) {
        alert('Reproductor no inicializado');
        return;
    }

    try {
        const quality = dashPlayer.getQualityFor('video');
        const bitrates = dashPlayer.getBitrateInfoListFor('video');

        let message = `📊 INFORMACIÓN\n`;
        message += `Video: ${VIDEOS[currentVideoIndex].name}\n`;
        message += `Calidad actual: ${quality}\n`;

        if (bitrates && bitrates.length > 0) {
            message += `\nCalidades disponibles: ${bitrates.length}\n`;
        } else {
            message += `\nEsperando información...\n`;
        }

        alert(message);

    } catch (error) {
        alert('Información no disponible');
    }
}

// Navegación simple entre videos
function nextVideo() {
    const select = document.getElementById('videoSelect');
    if (!select) return;

    currentVideoIndex = (currentVideoIndex + 1) % VIDEOS.length;
    select.selectedIndex = currentVideoIndex;
    changeSimpleVideo();
}

function previousVideo() {
    const select = document.getElementById('videoSelect');
    if (!select) return;

    currentVideoIndex = (currentVideoIndex - 1 + VIDEOS.length) % VIDEOS.length;
    select.selectedIndex = currentVideoIndex;
    changeSimpleVideo();
}

// =================== FUNCIONES GLOBALES ===================

window.playVideo = playVideo;
window.pauseVideo = pauseVideo;
window.showQualityInfo = showQualityInfo;
window.nextVideo = nextVideo;
window.previousVideo = previousVideo;

console.log('✅ dash-player.js cargado - Versión simplificada');