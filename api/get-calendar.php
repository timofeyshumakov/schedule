<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Подключаемся к SQLite
    $dbPath = __DIR__ . '/../database/production_calendar.db';
    
    if (!file_exists($dbPath)) {
        echo json_encode([]);
        exit;
    }
    
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Получаем все записи
    $stmt = $pdo->query("SELECT * FROM production_calendar ORDER BY year DESC");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($data);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка: ' . $e->getMessage()
    ]);
}
?>