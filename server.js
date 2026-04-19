const readline = require('readline');
const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

//membuat array untuk rl nya
const rl = readline.createInterface({
    input : process.stdin,
    output : process.stdout
});

//--membuat pertanyaan rl.question yang mendukung await
const question = util.promisify(rl.question).bind(rl);

//--membuat fungsi yang async
async function main() {
    //--panggil fungsi pathQuestion
    await pathQuestion();

    //--Panggil fungsi portQuestion()
    await portQuestion();

    //--menghentikan rl.question supaya input terhenti
    rl.close();

    //--panggil fungsi untuk mengambil ipv4 pada komputer
    getIP();

    //--panggil fungsi untuk membuat server
    createServer();
}

//--variabel penampung path
let folderTujuan = '';

//--membuat fungsi untuk input url html
async function pathQuestion() {
    console.log('===================================');
    console.log('Masukkan folder path menggunakan Foward Slash (/)!');
    console.log('Contoh : E:/coding/html/...');
    const askPath = await question('Path folder html : ');

    if (askPath === ''){
        console.log(' ');
        console.log('Info :')
        console.log('-->Masukkan path!');
        console.log(' ');
        await pathQuestion();
    } else if (!fs.existsSync(askPath)){
        console.log(' ');
        console.log('Info :')
        console.log('-->Path tidak ditemukan!');
        console.log('-->Masukkan Path dengan benar!');
        console.log(' ');
        await pathQuestion();
    } else if (fs.existsSync(askPath)) {
        folderTujuan = askPath;
        console.log(' ');
        console.log('Info :')
        console.log(`-->OKE! Path di set ke ${folderTujuan}`);
        console.log(' ');
    }
}

//--variabel penampung port
let PORT;

//--membuat fungsi untuk logika input port
async function portQuestion(){
    console.log('===================================');
    const askPort = 'Masukkan port : ';
    const linkPort = await question(askPort);
    let intger = Number(linkPort);

    if (linkPort === ""){
        PORT = 8080;
        console.log(' ');
        console.log('Info :')
        console.log(`-->Port di set ke default : ${PORT}`)
        console.log(' ');
    } else if (isNaN(intger) && !Number.isInteger(intger)){
        console.log(' ');
        console.log('Info :')
        console.log('-->Masukkan Angka!');
        console.log(' ');
        await portQuestion();
    } else if (linkPort.length > 4 || linkPort.length < 4){
        console.log(' ');
        console.log('Info :')
        console.log('-->Masukkan 4 angka saja!');
        console.log(' ');
        await portQuestion();
    } else {
        PORT = intger;
        console.log(' ');
        console.log('Info :')
        console.log(`-->OKE! Port di set ke : ${PORT}`);
        console.log(' ');
    }
}

//--membuar variabel untuk server
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
            case '.ttf': contentType = 'font/ttf'; break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

//--variabel penampung info ipv4
let ipv4Address = '';

//--fungsi untuk mengambil info ipv4
function getIP() {
    const networkInterfaces = os.networkInterfaces();
    
    //--mencari alamat ipv4
    for(const interfacesName in networkInterfaces){
        const interfaces = networkInterfaces[interfacesName];
        for(const iface of interfaces){
            if(iface.family === 'IPv4' && !iface.internal){
                ipv4Address = iface.address;
                break;
            }
        }
        if(ipv4Address){
            break;
        }
    }
    
    if(!ipv4Address){
        console.log('===================================');
        console.log('IPv4 Address tidak ditemukan!');
        console.log('Server hanya bisa dibuka di komputer ini.');
        console.log(' ');
    }
}

//--fungsi untuk membuat server
function createServer(){
    server.listen(PORT, '0.0.0.0', () => {
        console.log('===================================');
        console.log('Server Aktif!');
        console.log('Buka browser untuk melihat server!');
        console.log(' ');
        console.log('Ketik :');
        console.log(`1. http://localhost:${PORT} untuk melihat server pada browser di laptop`);
        if(ipv4Address){
            console.log(`2. http://${ipv4Address}:${PORT} untuk melihat server pada perangkat lain di jaringan yang sama`);
        }
        console.log('');
        console.log('Tekan ctrl + c untuk mengakhiri server');
    });
}

//--panggil fungsi main()
main();
