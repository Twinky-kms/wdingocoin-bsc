const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.connection = null;
        this.nodeId = null;
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

    setNodeId(nodeId) {
        this.nodeId = nodeId;
    }

    async log(message) {
        if (!this.nodeId) {
            console.error('Node ID not set. Please call setNodeId() first.');
            return;
        }

        try {
            await this.connect();
            const query = 'INSERT INTO debug_logs (node_id, log_message) VALUES (?, ?)';
            await this.connection.execute(query, [this.nodeId, message]);
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