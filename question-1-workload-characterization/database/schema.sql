
-- Metrics table for raw workload data
CREATE TABLE workload_metrics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timestamp DOUBLE NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    arrival_rate FLOAT,
    inter_arrival_time FLOAT,
    burst_factor FLOAT,
    cpu_time FLOAT,
    memory_usage BIGINT,
    io_operations INT,
    network_bytes BIGINT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    user_id BIGINT UNSIGNED,
    tenant_id BIGINT UNSIGNED,
    db_queries INT,
    cache_hits INT,
    cache_misses INT,
    external_api_calls INT,
    response_time FLOAT,
    response_size BIGINT,
    status_code SMALLINT,
    workload_type VARCHAR(50),
    priority VARCHAR(20),
    complexity_score FLOAT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_workload_type (workload_type),
    INDEX idx_endpoint (endpoint),
    INDEX idx_user_tenant (user_id, tenant_id)
) ENGINE=InnoDB PARTITION BY RANGE (UNIX_TIMESTAMP(timestamp)) (
    PARTITION p_current VALUES LESS THAN (UNIX_TIMESTAMP('2024-02-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Aggregated workload data for faster queries
CREATE TABLE workload_aggregations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    window_start BIGINT NOT NULL,
    window_end BIGINT NOT NULL,
    workload_type VARCHAR(50),
    request_count INT,
    avg_response_time FLOAT,
    p95_response_time FLOAT,
    p99_response_time FLOAT,
    avg_cpu_time FLOAT,
    avg_memory_usage BIGINT,
    error_count INT,
    UNIQUE KEY uk_window_type (window_start, workload_type),
    INDEX idx_window (window_start, window_end)
) ENGINE=InnoDB;