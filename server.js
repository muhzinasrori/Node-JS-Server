const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const folderTujuan = 'E:\\coding\\HTML\\Pemutar Video\\';

const server = http.createServer((req, res) => {
    //--header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Contorl-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'RANGE, Content-Type');

    if(req.method === 'OPTIONS'){
        res.writeHead(204);
        return res.end();
    }

    let requestUrl = req.url === '/' ? '/index.html' : req.url;
    let filePath = path.join(folderTujuan, decodeURIComponent(requestUrl));
    const ext = path.extname(filePath).toLowerCase();

    // --- LOGIKA KHUSUS VIDEO (STREAMING) ---
    if (ext === '.mp4' || ext === '.mkv') {
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            return res.end('Video tidak ditemukan');
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        //--menentukan MIME
        const mimeType = ext === '.mp4' ? 'video/mp4' : 'video/x-matroska';

        if (range) {
            // Browser meminta potongan video (Buffering)
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1; // Kirim per chunk

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            };

            res.writeHead(206, head); // 206 = Partial Content
            file.pipe(res);
        } else {
            // Permintaan awal tanpa range
            const head = {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'Bytes', //--Agar browser pada tv tahu bahwa pemutaran video mendukung scroll/seek 
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
        return; // Hentikan eksekusi agar tidak lanjut ke readFile bawah
    }

    // --- LOGIKA FILE BIASA (HTML, CSS, JS) ---
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404 Not Found</h1>');
        }

        let contentType = 'text/html';
        switch (ext) {
            case '.css': contentType = 'text/css'; break;
            case '.js':  contentType = 'text/javascript'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpg'; break;
            case '.ttf': contentType = 'font/ttf'; break; // Tambahkan untuk font ikon kamu
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

const port = 3000;

server.listen(port, '0.0.0.0', () => {
    //--membuat variabel
    const networkInterfaces = os.networkInterfaces();
    let localIp = '';

    //--mencari alamat ipv4
    for(const interfacesName in networkInterfaces){
        const interfaces = networkInterfaces[interfacesName];
        for(const iface of interfaces){
            if(iface.family === 'IPv4' && !iface.internal){
                localIp = iface.address;
                break;
            }
        }
        if(localIp){
            break;
        }
    }

    console.log('===================================');
    console.log('Server Aktif!');
    if(localIp){
        console.log(`
            Buka :
            1. http://localhost:${port} untuk browser pada laptop ini.
            2. http://${localIp}:${port} untuk browser pada perangkat lain.
            3. Tekan ctrl + c untuk mengakiri server.
        `);
    } else{
        console.log(`
            Ipv4 tidak dapat ditemukan!
            Buka http://localhost:${port} untuk browser pada laptop ini.
            Tekan ctrl + c untuk mengakhiri server
        `);
    }
});
