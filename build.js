const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

// Crear carpeta dist si no existe
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Función para copiar archivos/directorios
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Lista de archivos/carpetas a copiar
const filesToCopy = [
    'index.html',
    'styles.css',
    'app.js',
    'catalogo-publico.html',
    'catalogo-publico.css',
    'catalogo-publico.js',
    'lista-canje.html',
    'public',
    'services',
    // Agrega otros archivos necesarios aquí
];

console.log('📦 Copiando archivos a dist/...');
filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(distDir, file);
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
    } else {
        console.warn(`⚠️ Advertencia: ${file} no encontrado.`);
    }
});

// Generar config.js con variables de entorno
console.log('🔑 Generando config.js con variables de entorno...');

const configContent = `// ============================================
// CONFIGURACIÓN CENTRAL (GENERADO AUTOMÁTICAMENTE)
// ============================================

const CONFIG = {
    // Supabase
    supabase: {
        url: '${process.env.SUPABASE_URL || 'https://gyonguqndcsmudqmptfb.supabase.co'}',
        anonKey: '${process.env.SUPABASE_ANON_KEY || ''}'
    },

    // Builderbot WhatsApp
    whatsapp: {
        apiKey: '${process.env.BUILDERBOT_WHATSAPP_KEY || ''}',
        botId: '${process.env.BUILDERBOT_WHATSAPP_BOT_ID || 'e7b46f56-d304-4bef-8886-803d5fb393dd'}',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    },

    // Builderbot Instagram
    instagram: {
        apiKey: '${process.env.BUILDERBOT_INSTAGRAM_KEY || ''}',
        botId: '${process.env.BUILDERBOT_INSTAGRAM_BOT_ID || '931b173b-f544-43a3-9e73-7ed55020ffa0'}',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    }
};

export default CONFIG;
`;

// Escribir en dist (por si se configuró Output Directory: dist)
if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'config.js'), configContent);
}

// Escribir en raíz (por si se usa la configuración por defecto de Vercel)
fs.writeFileSync(path.join(__dirname, 'config.js'), configContent);

console.log('✅ Config.js generado en raíz y /dist');
console.log('✅ Build completado exitosamente');
