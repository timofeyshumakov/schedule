<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Employee.php';

class EmployeeController
{
    private Employee $employee;

    public function __construct()
    {
        $this->employee = new Employee();
    }

    public function handle(string $method): void
    {
        switch ($method) {
            case 'GET':
                $activeOnly = isset($_GET['active']) && $_GET['active'] === 'true';
                $employees = $activeOnly
                    ? $this->employee->getActiveEmployees()
                    : $this->employee->getAll();
                echo json_encode(['success' => true, 'data' => $employees]);
                break;

            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (empty($data['name'])) {
                    throw new Exception('Name is required');
                }
                if (!$this->employee->create($data['name'])) {
                    throw new Exception('Failed to create employee');
                }
                echo json_encode(['success' => true, 'message' => 'Employee created']);
                break;

            case 'PUT':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (!isset($data['id'])) {
                    throw new Exception('Employee ID is required');
                }
                $updateData = [];
                if (isset($data['name'])) {
                    $updateData['name'] = $data['name'];
                }
                if (isset($data['created_at'])) {
                    $updateData['created_at'] = $data['created_at'];
                }
                $updateData['termination_date'] = array_key_exists('termination_date', $data)
                    ? $data['termination_date']
                    : null;

                if (!$this->employee->update($data['id'], $updateData)) {
                    throw new Exception('Failed to update employee');
                }
                echo json_encode(['success' => true, 'message' => 'Employee updated']);
                break;

            case 'DELETE':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (!isset($data['id'])) {
                    throw new Exception('Employee ID is required');
                }
                if (!empty($data['permanent'])) {
                    if (!$this->employee->deletePermanently($data['id'])) {
                        throw new Exception('Failed to delete employee permanently');
                    }
                    echo json_encode(['success' => true, 'message' => 'Employee permanently deleted']);
                } else {
                    $terminationDate = $data['termination_date'] ?? date('Y-m-d');
                    if (!$this->employee->terminate($data['id'], $terminationDate)) {
                        throw new Exception('Failed to terminate employee');
                    }
                    echo json_encode(['success' => true, 'message' => 'Employee terminated']);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
}
