<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Schedule.php';
require_once __DIR__ . '/../models/Employee.php';

class ScheduleController
{
    private Schedule $schedule;

    public function __construct()
    {
        $this->schedule = new Schedule();
    }

    public function handle(string $method): void
    {
        switch ($method) {
            case 'GET':
                if (!isset($_GET['start_date'], $_GET['end_date'])) {
                    throw new Exception('Start date and end date are required');
                }
                $schedules = $this->schedule->getEmployeeScheduleForPeriod(
                    $_GET['start_date'],
                    $_GET['end_date']
                );
                echo json_encode(['success' => true, 'data' => $schedules]);
                break;

            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (!empty($data['bulk_update'])) {
                    if (!isset($data['employee_id'], $data['start_date'], $data['end_date'], $data['status'])) {
                        throw new Exception('All parameters are required for bulk update');
                    }
                    if (!$this->schedule->bulkUpdate(
                        $data['employee_id'],
                        $data['start_date'],
                        $data['end_date'],
                        $data['status']
                    )) {
                        throw new Exception('Failed to update schedule');
                    }
                    echo json_encode(['success' => true, 'message' => 'Schedule updated']);
                } else {
                    if (!isset($data['employee_id'], $data['date'], $data['status'])) {
                        throw new Exception('Employee ID, date and status are required');
                    }
                    if (!$this->schedule->updateStatus(
                        $data['employee_id'],
                        $data['date'],
                        $data['status']
                    )) {
                        throw new Exception('Failed to update status');
                    }
                    echo json_encode(['success' => true, 'message' => 'Status updated']);
                }
                break;

            case 'DELETE':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (!isset($data['employee_id'])) {
                    throw new Exception('Employee ID is required');
                }
                $terminationDate = $data['termination_date'] ?? date('Y-m-d');
                if (!$this->schedule->terminateEmployee($data['employee_id'], $terminationDate)) {
                    throw new Exception('Failed to terminate employee');
                }
                echo json_encode(['success' => true, 'message' => 'Employee terminated successfully']);
                break;

            default:
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
}
