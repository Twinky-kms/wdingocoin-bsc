-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS dingo_debug;
USE dingo_debug;

-- Create debug logs table
CREATE TABLE IF NOT EXISTS debug_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    node_id VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    log_type ENUM('info', 'error', 'warning', 'debug') NOT NULL DEFAULT 'info',
    log_message TEXT NOT NULL,
    details JSON,
    INDEX idx_timestamp (timestamp),
    INDEX idx_node (node_id),
    INDEX idx_network (network),
    INDEX idx_type (log_type),
    INDEX idx_node_network (node_id, network)
); 