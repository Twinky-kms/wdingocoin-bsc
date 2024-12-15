-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS dingo_bridge;
USE dingo_bridge;

-- Mirror of usedDepositAddresses
CREATE TABLE IF NOT EXISTS used_deposit_addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_address (address),
    INDEX idx_node_network (node_id, network)
);

-- Mirror of mintDepositAddresses
CREATE TABLE IF NOT EXISTS mint_deposit_addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    mint_address VARCHAR(255) NOT NULL,
    deposit_address VARCHAR(255) NOT NULL,
    redeem_script TEXT NOT NULL,
    approved_tax VARCHAR(255) NOT NULL DEFAULT '0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_mint_address (mint_address),
    UNIQUE KEY unique_deposit_address (deposit_address),
    INDEX idx_node_network (node_id, network)
);

-- Mirror of withdrawals
CREATE TABLE IF NOT EXISTS withdrawals_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    burn_address VARCHAR(255) NOT NULL,
    burn_index BIGINT NOT NULL,
    approved_amount VARCHAR(255) NOT NULL DEFAULT '0',
    approved_tax VARCHAR(255) NOT NULL DEFAULT '0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_withdrawal (burn_address, burn_index),
    INDEX idx_node_network (node_id, network)
);

-- Debug logs table (existing from previous implementation)
CREATE TABLE IF NOT EXISTS debug_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    node_id VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    log_type ENUM('info', 'error', 'warning', 'debug') NOT NULL DEFAULT 'info',
    log_message LONGTEXT NOT NULL,
    details LONGTEXT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_node (node_id),
    INDEX idx_network (network),
    INDEX idx_type (log_type),
    INDEX idx_node_network (node_id, network)
); 