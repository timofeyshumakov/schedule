<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../models/Employee.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$employee = new Employee();

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $employees = $employee->getAll();
            echo json_encode(['success' => true, 'data' => $employees]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['name']) || empty($data['name'])) {
                throw new Exception('Name is required');
            }

            if ($employee->create($data['name'])) {
                echo json_encode(['success' => true, 'message' => 'Employee created']);
            } else {
                throw new Exception('Failed to create employee');
            }
            break;

        case 'DELETE':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['id'])) {
                throw new Exception('Employee ID is required');
            }

            if ($employee->delete($data['id'])) {
                echo json_encode(['success' => true, 'message' => 'Employee deleted']);
            } else {
                throw new Exception('Failed to delete employee');
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