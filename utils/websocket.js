const WebSocket = require('ws');

const setupWebSocket = (server) => {
    const wss = new WebSocket.Server({ server, path: '/ws' });
    const channels = {
        schools: new Map(),
        fleet: new Set()
    };

    wss.on('connection', (ws, req) => {
        // Parse URL params safely
        let schoolId = null;
        let type = null;
        
        try {
            const urlParts = req.url.split('?');
            if (urlParts.length > 1) {
                const params = new URLSearchParams(urlParts[1]);
                schoolId = params.get('schoolId');
                type = params.get('type');
            } else {
                // Fallback for older schoolId connection style
                schoolId = req.url.split('?schoolId=')[1];
            }
        } catch (e) {
            console.error('WebSocket URL parse error:', e);
        }

        if (schoolId) {
            if (!channels.schools.has(schoolId)) {
                channels.schools.set(schoolId, new Set());
            }
            channels.schools.get(schoolId).add(ws);
            
            ws.on('close', () => {
                if (channels.schools.has(schoolId)) {
                    channels.schools.get(schoolId).delete(ws);
                    if (channels.schools.get(schoolId).size === 0) {
                        channels.schools.delete(schoolId);
                    }
                }
            });
        } else if (type === 'fleet') {
            channels.fleet.add(ws);
            ws.on('close', () => {
                channels.fleet.delete(ws);
            });
        }
    });

    return {
        broadcastToSchool: (schoolId, data) => {
            if (channels.schools.has(schoolId)) {
                const message = JSON.stringify(data);
                for (const client of channels.schools.get(schoolId)) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }
            }
        },
        broadcastToFleet: (data) => {
            const message = JSON.stringify(data);
            for (const client of channels.fleet) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            }
        }
    };
};

module.exports = setupWebSocket;
