<?php

namespace App\Workload;

class WorkloadCharacterizationModel
{
    private const METRICS_TABLE = 'workload_metrics';
    private const AGGREGATION_TABLE = 'workload_aggregations';
    
    private $db;
    private $cache;
    private $logger;
    
    public function __construct($database, $cache, $logger)
    {
        $this->db = $database;
        $this->cache = $cache;
        $this->logger = $logger;
    }
    
    /**
     * Core Workload Dimensions
     */
    public function captureWorkloadMetrics(array $context): void
    {
        $metrics = [
            'timestamp' => microtime(true),
            'request_id' => $context['request_id'] ?? uniqid('req_', true),
            
            // Arrival Characteristics
            'arrival_rate' => $this->calculateArrivalRate(),
            'inter_arrival_time' => $this->getInterArrivalTime(),
            'burst_factor' => $this->detectBurstPattern(),
            
            // Service Demand
            'cpu_time' => $this->getCpuTime(),
            'memory_usage' => memory_get_peak_usage(true),
            'io_operations' => $context['io_ops'] ?? 0,
            'network_bytes' => $context['network_bytes'] ?? 0,
            
            // Request Characteristics
            'endpoint' => $context['endpoint'] ?? 'unknown',
            'method' => $context['method'] ?? 'GET',
            'user_id' => $context['user_id'] ?? null,
            'tenant_id' => $context['tenant_id'] ?? null,
            
            // Resource Consumption
            'db_queries' => $context['db_queries'] ?? 0,
            'cache_hits' => $context['cache_hits'] ?? 0,
            'cache_misses' => $context['cache_misses'] ?? 0,
            'external_api_calls' => $context['external_api_calls'] ?? 0,
            
            // Response Characteristics
            'response_time' => $context['response_time'] ?? 0,
            'response_size' => $context['response_size'] ?? 0,
            'status_code' => $context['status_code'] ?? 200,
            
            // Workload Classification
            'workload_type' => $this->classifyWorkload($context),
            'priority' => $context['priority'] ?? 'normal',
            'complexity_score' => $this->calculateComplexity($context),
        ];
        
        $this->persistMetrics($metrics);
        $this->updateRealTimeAggregates($metrics);
    }
    
    /**
     * Workload Classification
     */
    private function classifyWorkload(array $context): string
    {
        $endpoint = $context['endpoint'] ?? '';
        $method = $context['method'] ?? 'GET';
        
        // Read-heavy workloads
        if (in_array($method, ['GET', 'HEAD'])) {
            return 'read_intensive';
        }
        
        // Write-heavy workloads
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return 'write_intensive';
        }
        
        // Analytical workloads
        if (strpos($endpoint, '/analytics') !== false || 
            strpos($endpoint, '/reports') !== false) {
            return 'analytical';
        }
        
        // Batch processing
        if (strpos($endpoint, '/batch') !== false) {
            return 'batch_processing';
        }
        
        return 'mixed';
    }
    
    /**
     * Calculate workload complexity based on multiple factors
     */
    private function calculateComplexity(array $context): float
    {
        $score = 0;
        
        // Database query complexity
        $score += ($context['db_queries'] ?? 0) * 2;
        
        // External API dependency
        $score += ($context['external_api_calls'] ?? 0) * 5;
        
        // Data volume processed
        $dataVolume = ($context['request_size'] ?? 0) + ($context['response_size'] ?? 0);
        $score += log($dataVolume + 1, 10);
        
        // Computational intensity
        $score += ($context['cpu_time'] ?? 0) * 10;
        
        return round($score, 2);
    }
    
    /**
     * Real-time workload aggregation
     */
    private function updateRealTimeAggregates(array $metrics): void
    {
        $window = floor($metrics['timestamp'] / 60) * 60; // 1-minute window
        
        $key = sprintf('workload_agg:%s:%s', $window, $metrics['workload_type']);
        
        $aggregate = $this->cache->get($key) ?? [
            'window_start' => $window,
            'workload_type' => $metrics['workload_type'],
            'request_count' => 0,
            'total_response_time' => 0,
            'total_cpu_time' => 0,
            'total_memory' => 0,
            'error_count' => 0,
        ];
        
        $aggregate['request_count']++;
        $aggregate['total_response_time'] += $metrics['response_time'];
        $aggregate['total_cpu_time'] += $metrics['cpu_time'];
        $aggregate['total_memory'] += $metrics['memory_usage'];
        
        if ($metrics['status_code'] >= 400) {
            $aggregate['error_count']++;
        }
        
        $this->cache->set($key, $aggregate, 300); // 5-minute TTL
    }
    
    /**
     * Generate workload profile for capacity planning
     */
    public function generateWorkloadProfile(string $period = '24h'): array
    {
        $data = $this->db->query("
            SELECT 
                workload_type,
                COUNT(*) as request_count,
                AVG(response_time) as avg_response_time,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_response_time,
                AVG(cpu_time) as avg_cpu_time,
                AVG(memory_usage) as avg_memory_usage,
                AVG(db_queries) as avg_db_queries,
                AVG(complexity_score) as avg_complexity,
                SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
            FROM " . self::METRICS_TABLE . "
            WHERE timestamp >= ?
            GROUP BY workload_type
        ", [time() - $this->parsePeriod($period)]);
        
        return $data->fetchAll();
    }
    
    /**
     * Detect workload patterns and anomalies
     */
    public function detectAnomalies(): array
    {
        $baseline = $this->getBaselineMetrics();
        $current = $this->getCurrentMetrics();
        
        $anomalies = [];
        
        foreach ($current as $metric => $value) {
            if (!isset($baseline[$metric])) continue;
            
            $threshold = $baseline[$metric]['mean'] + (3 * $baseline[$metric]['stddev']);
            
            if ($value > $threshold) {
                $anomalies[] = [
                    'metric' => $metric,
                    'current_value' => $value,
                    'baseline_mean' => $baseline[$metric]['mean'],
                    'threshold' => $threshold,
                    'severity' => $this->calculateSeverity($value, $threshold),
                ];
            }
        }
        
        return $anomalies;
    }
    
    /**
     * Workload forecasting for capacity planning
     */
    public function forecastWorkload(int $daysAhead = 7): array
    {
        // Simple linear regression-based forecast
        $historical = $this->getHistoricalTrends(30);
        
        $forecast = [];
        foreach ($historical as $workloadType => $trend) {
            $slope = $this->calculateSlope($trend);
            $intercept = $this->calculateIntercept($trend, $slope);
            
            $predictions = [];
            for ($day = 1; $day <= $daysAhead; $day++) {
                $predictions[$day] = max(0, $intercept + ($slope * (count($trend) + $day)));
            }
            
            $forecast[$workloadType] = [
                'predictions' => $predictions,
                'confidence' => $this->calculateConfidence($trend),
                'trend' => $slope > 0 ? 'increasing' : ($slope < 0 ? 'decreasing' : 'stable'),
            ];
        }
        
        return $forecast;
    }
    
    // Helper methods
    private function calculateArrivalRate(): float
    {
        $key = 'arrival_rate:' . floor(time() / 60);
        $count = $this->cache->increment($key) ?? 1;
        $this->cache->expire($key, 120);
        return $count;
    }
    
    private function getInterArrivalTime(): float
    {
        $lastArrival = $this->cache->get('last_arrival_time') ?? microtime(true);
        $current = microtime(true);
        $this->cache->set('last_arrival_time', $current, 60);
        return $current - $lastArrival;
    }
    
    private function detectBurstPattern(): float
    {
        $currentRate = $this->calculateArrivalRate();
        $avgRate = $this->cache->get('avg_arrival_rate') ?? $currentRate;
        return $avgRate > 0 ? $currentRate / $avgRate : 1.0;
    }
    
    private function getCpuTime(): float
    {
        $usage = getrusage();
        return ($usage['ru_utime.tv_sec'] + $usage['ru_utime.tv_usec'] / 1000000) +
               ($usage['ru_stime.tv_sec'] + $usage['ru_stime.tv_usec'] / 1000000);
    }
    
    private function persistMetrics(array $metrics): void
    {
        // Async insert for performance
        $this->db->insertAsync(self::METRICS_TABLE, $metrics);
    }
    
    private function parsePeriod(string $period): int
    {
        $units = ['h' => 3600, 'd' => 86400, 'w' => 604800];
        $value = (int)$period;
        $unit = substr($period, -1);
        return $value * ($units[$unit] ?? 3600);
    }
    
    private function getBaselineMetrics(): array
    {
        return $this->cache->remember('baseline_metrics', 300, function() {
            return $this->db->query("
                SELECT 
                    'response_time' as metric,
                    AVG(response_time) as mean,
                    STDDEV(response_time) as stddev
                FROM " . self::METRICS_TABLE . "
                WHERE timestamp >= ?
            ", [time() - 86400])->fetch();
        });
    }
    
    private function getCurrentMetrics(): array
    {
        $recent = $this->db->query("
            SELECT AVG(response_time) as response_time
            FROM " . self::METRICS_TABLE . "
            WHERE timestamp >= ?
        ", [time() - 300])->fetch();
        
        return $recent;
    }
    
    private function calculateSeverity(float $value, float $threshold): string
    {
        $ratio = $value / $threshold;
        if ($ratio > 2) return 'critical';
        if ($ratio > 1.5) return 'high';
        if ($ratio > 1.2) return 'medium';
        return 'low';
    }
    
    private function getHistoricalTrends(int $days): array
    {
        return $this->db->query("
            SELECT 
                workload_type,
                DATE(FROM_UNIXTIME(timestamp)) as date,
                COUNT(*) as daily_count
            FROM " . self::METRICS_TABLE . "
            WHERE timestamp >= ?
            GROUP BY workload_type, DATE(FROM_UNIXTIME(timestamp))
            ORDER BY date
        ", [time() - ($days * 86400)])->fetchAll();
    }
    
    private function calculateSlope(array $data): float
    {
        $n = count($data);
        if ($n < 2) return 0;
        
        $sumX = $sumY = $sumXY = $sumX2 = 0;
        foreach ($data as $i => $point) {
            $sumX += $i;
            $sumY += $point['daily_count'];
            $sumXY += $i * $point['daily_count'];
            $sumX2 += $i * $i;
        }
        
        return ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
    }
    
    private function calculateIntercept(array $data, float $slope): float
    {
        $n = count($data);
        $meanY = array_sum(array_column($data, 'daily_count')) / $n;
        $meanX = ($n - 1) / 2;
        return $meanY - $slope * $meanX;
    }
    
    private function calculateConfidence(array $data): float
    {
        // Simple R-squared calculation
        $n = count($data);
        if ($n < 3) return 0;
        
        $mean = array_sum(array_column($data, 'daily_count')) / $n;
        $ssTotal = $ssResidual = 0;
        
        foreach ($data as $i => $point) {
            $predicted = $this->calculateIntercept($data, $this->calculateSlope($data)) + 
                        $this->calculateSlope($data) * $i;
            $ssTotal += pow($point['daily_count'] - $mean, 2);
            $ssResidual += pow($point['daily_count'] - $predicted, 2);
        }
        
        return $ssTotal > 0 ? 1 - ($ssResidual / $ssTotal) : 0;
    }
}