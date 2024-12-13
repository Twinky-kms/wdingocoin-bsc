const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.connection = null;
        this.nodeId = null;
        this.network = null;
    }

    async connect() {
        if (this.connection) return;

        const credsPath = path.join(__dirname, '../settings/mysql.credentials.json');
        const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        
        this.connection = await mysql.createConnection({
            host: credentials.host,
            user: credentials.user,
            password: credentials.password,
            database: credentials.database
        });
    }

    findNodeAndNetwork() {
        const sslConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings/ssl.json'), 'utf8'));
        const networks = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings/networks.json'), 'utf8'));
        
        // Extract hostname from certPath
        // Example path: /etc/letsencrypt/live/n4.dingocoin.org/fullchain.pem
        const hostname = sslConfig.certPath.split('/').slice(-2)[0];

        // Search through all networks to find matching node
        for (const [networkName, networkConfig] of Object.entries(networks)) {
            if (networkConfig.authorityNodes) {
                const node = networkConfig.authorityNodes.find(n => n.hostname === hostname);
                if (node) {
                    return {
                        network: networkName,
                        node: node
                    };
                }
            }
        }
        throw new Error(`No matching node found for hostname: ${hostname}`);
    }

    initialize() {
        const { network, node } = this.findNodeAndNetwork();
        this.network = network;
        this.nodeId = `${node.hostname}:${node.walletAddress}`;
    }

    async log(message) {
        if (!this.nodeId || !this.network) {
            this.initialize();
        }

        try {
            await this.connect();
            const query = 'INSERT INTO debug_logs (node_id, network, log_message) VALUES (?, ?, ?)';
            await this.connection.execute(query, [this.nodeId, this.network, message]);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }
}

const logger = new Logger();
module.exports = logger; 