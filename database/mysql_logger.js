const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class MySQLLogger {
    constructor() {
        this.connection = null;
        this.nodeId = null;
        this.network = null;
        this.isConnected = false;
    }

    async connect() {
        if (this.connection) return;

        try {
            const credsPath = path.join(__dirname, '../settings/mysql.credentials.json');
            const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            
            this.connection = await mysql.createConnection({
                host: credentials.host,
                user: credentials.user,
                password: credentials.password,
                database: credentials.database,
                port: credentials.port || 3306
            });
            
            this.isConnected = true;
        } catch (error) {
            console.error('MySQL Connection Error:', error);
            this.isConnected = false;
        }
    }

    findNodeAndNetwork() {
        const sslConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings/ssl.json'), 'utf8'));
        const networks = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings/networks.json'), 'utf8'));
        
        // Extract hostname from certPath
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

    async logUsedDepositAddress(address) {
        if (!this.isConnected) return;
        if (!this.nodeId || !this.network) {
            this.initialize();
        }

        try {
            const query = 'INSERT INTO used_deposit_addresses (node_id, network, address) VALUES (?, ?, ?)';
            await this.connection.execute(query, [this.nodeId, this.network, address]);
        } catch (error) {
            console.error('Failed to log used deposit address:', error);
        }
    }

    async logMintDepositAddress(mintAddress, depositAddress, redeemScript, approvedTax = "0") {
        if (!this.isConnected) return;
        if (!this.nodeId || !this.network) {
            this.initialize();
        }

        try {
            const query = `
                INSERT INTO mint_deposit_addresses 
                (node_id, network, mint_address, deposit_address, redeem_script, approved_tax) 
                VALUES (?, ?, ?, ?, ?, ?)`;
            await this.connection.execute(query, [
                this.nodeId, 
                this.network, 
                mintAddress, 
                depositAddress, 
                redeemScript, 
                approvedTax
            ]);
        } catch (error) {
            console.error('Failed to log mint deposit address:', error);
        }
    }

    async updateMintDepositAddress(depositAddress, approvedTax) {
        if (!this.isConnected) return;
        if (!this.nodeId || !this.network) {
            this.initialize();
        }

        try {
            const query = `
                UPDATE mint_deposit_addresses 
                SET approved_tax = ?
                WHERE deposit_address = ? AND node_id = ? AND network = ?`;
            await this.connection.execute(query, [approvedTax, depositAddress, this.nodeId, this.network]);
        } catch (error) {
            console.error('Failed to update mint deposit address:', error);
        }
    }

    async logWithdrawal(burnAddress, burnIndex, approvedAmount = "0", approvedTax = "0") {
        if (!this.isConnected) return;
        if (!this.nodeId || !this.network) {
            this.initialize();
        }

        try {
            const query = `
                INSERT INTO withdrawals_log 
                (node_id, network, burn_address, burn_index, approved_amount, approved_tax) 
                VALUES (?, ?, ?, ?, ?, ?)`;
            await this.connection.execute(query, [
                this.nodeId, 
                this.network, 
                burnAddress, 
                burnIndex, 
                approvedAmount, 
                approvedTax
            ]);
        } catch (error) {
            console.error('Failed to log withdrawal:', error);
        }
    }

    async updateWithdrawal(burnAddress, burnIndex, approvedAmount, approvedTax) {
        if (!this.isConnected) return;
        if (!this.nodeId || !this.network) {
            this.initialize();
        }

        try {
            const query = `
                UPDATE withdrawals_log 
                SET approved_amount = ?, approved_tax = ?
                WHERE burn_address = ? AND burn_index = ? AND node_id = ? AND network = ?`;
            await this.connection.execute(query, [
                approvedAmount, 
                approvedTax, 
                burnAddress, 
                burnIndex, 
                this.nodeId, 
                this.network
            ]);
        } catch (error) {
            console.error('Failed to update withdrawal:', error);
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            this.isConnected = false;
        }
    }
}

// Create a singleton instance
const mysqlLogger = new MySQLLogger();
module.exports = mysqlLogger; 