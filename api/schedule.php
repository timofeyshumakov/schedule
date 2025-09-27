<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../models/Schedule.php';
require_once '../models/Employee.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$schedule = new Schedule();
$employee = new Employee();

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (!isset($_GET['start_date']) || !isset($_GET['end_date'])) {
                throw new Exception('Start date and end date are required');
            }

            $schedules = $schedule->getEmployeeScheduleForPeriod(
                $_GET['start_date'],
                $_GET['end_date']
            );
            echo json_encode(['success' => true, 'data' => $schedules]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (isset($data['bulk_update'])) {
                // Массовое обновление
                if (!isset($data['employee_id']) || !isset($data['start_date']) || 
                    !isset($data['end_date']) || !isset($data['status'])) {
                    throw new Exception('All parameters are required for bulk update');
                }

                if ($schedule->bulkUpdate(
                    $data['employee_id'],
                    $data['start_date'],
                    $data['end_date'],
                    $data['status']
                )) {
                    echo json_encode(['success' => true, 'message' => 'Schedule updated']);
                } else {
                    throw new Exception('Failed to update schedule');
                }
            } else {
                // Одиночное обновление
                if (!isset($data['employee_id']) || !isset($data['date']) || !isset($data['status'])) {
                    throw new Exception('Employee ID, date and status are required');
                }

                if ($schedule->updateStatus(
                    $data['employee_id'],
                    $data['date'],
                    $data['status']
                )) {
                    echo json_encode(['success' => true, 'message' => 'Status updated']);
                } else {
                    throw new Exception('Failed to update status');
                }
            }
            break;

        case 'DELETE':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['employee_id'])) {
                throw new Exception('Employee ID is required');
            }

            $employeeId = $data['employee_id'];

            if ($schedule->terminateEmployee($employeeId, $terminationDate)) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Employee terminated successfully'
                ]);
            } else {
                throw new Exception('Failed to terminate employee');
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