<?php

// In the application middleware
$workloadModel = new WorkloadCharacterizationModel($db, $cache, $logger);

// Capture metrics for each request
$startTime = microtime(true);
$startMemory = memory_get_usage(true);

//process request
$context = [
    'request_id' => $_SERVER['REQUEST_ID'] ?? uniqid(),
    'endpoint' => $_SERVER['REQUEST_URI'],
    'method' => $_SERVER['REQUEST_METHOD'],
    'user_id' => $authenticatedUser->id ?? null,
    'tenant_id' => $tenant->id ?? null,
    'db_queries' => $queryCounter->getCount(),
    'cache_hits' => $cacheMonitor->getHits(),
    'cache_misses' => $cacheMonitor->getMisses(),
    'external_api_calls' => $apiCounter->getCount(),
    'response_time' => (microtime(true) - $startTime) * 1000,
    'response_size' => strlen($response->getContent()),
    'status_code' => $response->getStatusCode(),
];

$workloadModel->captureWorkloadMetrics($context);

// Generate reports
$profile = $workloadModel->generateWorkloadProfile('24h');
$anomalies = $workloadModel->detectAnomalies();
$forecast = $workloadModel->forecastWorkload(7);
