const WebSocket = require('ws');

const setupWebSocket = (server) => {
    const wss = new WebSocket.Server({ server, path: '/ws' });
    const clients = new Map();

    wss.on('connection', (ws, req) => {
        const schoolId = req.url.split('?schoolId=')[1];

        if (schoolId) {
            if (!clients.has(schoolId)) {
                clients.set(schoolId, new Set());
            }
            clients.get(schoolId).add(ws);
        }

        ws.on('close', () => {
            if (schoolId && clients.has(schoolId)) {
                clients.get(schoolId).delete(ws);
                if (clients.get(schoolId).size === 0) {
                    clients.delete(schoolId);
                }
            }
        });
    });

    return {
        broadcastToSchool: (schoolId, data) => {
            if (clients.has(schoolId)) {
                const message = JSON.stringify(data);
                for (const client of clients.get(schoolId)) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }
            }
        }
    };
};

module.exports = setupWebSocket;
