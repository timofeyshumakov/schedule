<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../models/Deal.php';
require_once '../models/Schedule.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$deal = new Deal();
$schedule = new Schedule();

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
                $deals = $deal->getDealsForDateRange($_GET['start_date'], $_GET['end_date']);
            } else {
                $deals = $deal->getAll();
            }
            echo json_encode(['success' => true, 'data' => $deals]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['man_days']) || !isset($data['start_date']) || !isset($data['end_date'])) {
                throw new Exception('All parameters are required');
            }

            if ($deal->create($data['man_days'], $data['start_date'], $data['end_date'])) {
                echo json_encode(['success' => true, 'message' => 'Deal created']);
            } else {
                throw new Exception('Failed to create deal');
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>