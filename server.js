// ============================================
// SERVIDOR CORREGIDO - ACCESO DESDE CELULAR
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuración
const PORT = 3000;

// Obtener IP real (no virtual)
function getRealIP() {
    const interfaces = os.networkInterfaces();

    // Priorizar WiFi sobre Ethernet virtual
    for (const name of Object.keys(interfaces)) {
        // Ignorar adaptadores virtuales
        if (name.includes('Virtual') || name.includes('Hyper-V') ||
            name.includes('VMware') || name.includes('VirtualBox')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            // Solo IPv4, no loopback, no virtual
            if (iface.family === 'IPv4' && !iface.internal) {
                // Preferir WiFi
                if (name.includes('Wi-Fi') || name.includes('Wireless')) {
                    return iface.address;
                }
                // Ethernet real
                if (name.includes('Ethernet') && !iface.address.startsWith('192.168.56')) {
                    return iface.address;
                }
            }
        }
    }

    // Fallback: cualquier IP no virtual
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal &&
                !iface.address.startsWith('192.168.56') &&
                !iface.address.startsWith('169.254')) {
                return iface.address;
            }
        }
    }

    return 'localhost';
}

const REAL_IP = getRealIP();

// Crear servidor
const server = http.createServer((request, response) => {
    console.log(`🔸 ${new Date().toLocaleTimeString()} - ${request.method} ${request.url}`);

    // Ruta del archivo solicitado
    let filePath = '.' + request.url;

    // Si es la raíz, servir index.html
    if (filePath === './') {
        filePath = './index.html';
    }

    // Obtener extensión del archivo
    const extension = path.extname(filePath);

    // Mapear extensiones a tipos MIME
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.m4s': 'video/iso.segment',
        '.mpd': 'application/dash+xml',
        '.m3u8': 'application/vnd.apple.mpegurl',
        '.ts': 'video/MP2T'
    };

    // Tipo de contenido
    let contentType = mimeTypes[extension] || 'application/octet-stream';

    // Configurar headers CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar OPTIONS (CORS)
    if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
    }

    // Leer y servir el archivo
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Archivo no encontrado
                console.log(`❌ Archivo no encontrado: ${filePath}`);
                response.writeHead(404, { 'Content-Type': 'text/html' });
                response.end(`
                    <html>
                        <body style="font-family: Arial; padding: 40px;">
                            <h1>404 - Archivo no encontrado</h1>
                            <p>El archivo <strong>${filePath}</strong> no existe.</p>
                            <p>Regresa a: <a href="/">Página principal</a></p>
                        </body>
                    </html>
                `, 'utf-8');
            } else {
                // Error del servidor
                console.error(`🔥 Error del servidor: ${error.code}`);
                response.writeHead(500);
                response.end(`Error del servidor: ${error.code}`, 'utf-8');
            }
        } else {
            // Éxito
            response.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            response.end(content, 'utf-8');
        }
    });
});

// Iniciar servidor en TODAS las interfaces
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 SERVIDOR INICIADO EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log(`📍 URL Local: http://localhost:${PORT}`);
    console.log(`📍 URL WiFi: http://${REAL_IP}:${PORT}`);
    console.log('='.repeat(50));
    console.log('📂 Archivos disponibles:');
    console.log(`   • http://localhost:${PORT}/`);
    console.log(`   • http://localhost:${PORT}/videoclases.html`);
    console.log(`   • http://localhost:${PORT}/videollamada.html`);
    console.log('='.repeat(50));
    console.log('📱 Para acceder desde celular:');
    console.log(`   1. Conectar celular a la MISMA WiFi`);
    console.log(`   2. Abrir: http://${REAL_IP}:${PORT}`);
    console.log('='.repeat(50));
    console.log('🛑 Para detener: Presiona Ctrl + C');
    console.log('='.repeat(50));
});

// Manejar cierre
process.on('SIGINT', () => {
    console.log('\n🔴 Servidor detenido por el usuario');
    process.exit(0);

});
