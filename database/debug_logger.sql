-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS dingo_debug;
USE dingo_debug;

-- Create debug logs table
CREATE TABLE IF NOT EXISTS debug_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    node_id VARCHAR(255) NOT NULL,
    log_message TEXT NOT NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_node (node_id)
); 