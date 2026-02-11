import https from 'https';
import fs from 'fs';

const apiKey = 'AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                const names = json.models.map(m => m.name).join('\n');
                fs.writeFileSync('models.txt', names);
                console.log("Models written to models.txt");
            } else {
                console.log("Error:", JSON.stringify(json));
            }
        } catch (e) {
            console.error("Parse error:", e);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
