<?php
require_once '../config/database.php';

class Schedule {
    private $db;
    private $table = 'schedules';

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function terminateEmployee($employeeId, $terminationDate) {
        $sql = "UPDATE employees 
                SET termination_date = :termination_date 
                WHERE id = :employee_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindParam(':termination_date', $terminationDate);
        $stmt->bindParam(':employee_id', $employeeId);
        
        return $stmt->execute();
    }

    public function getByEmployeeAndDateRange($employeeId, $startDate, $endDate) {
        $stmt = $this->db->prepare("
            SELECT date, status 
            FROM {$this->table} 
            WHERE employee_id = ? AND date BETWEEN ? AND ?
            ORDER BY date
        ");
        $stmt->execute([$employeeId, $startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateStatus($employeeId, $date, $status) {
        // Проверяем, существует ли запись
        $checkStmt = $this->db->prepare("
            SELECT id FROM {$this->table} WHERE employee_id = ? AND date = ?
        ");
        $checkStmt->execute([$employeeId, $date]);
        
        if ($checkStmt->fetch()) {
            // Обновляем существующую запись
            $stmt = $this->db->prepare("
                UPDATE {$this->table} SET status = ? WHERE employee_id = ? AND date = ?
            ");
            return $stmt->execute([$status, $employeeId, $date]);
        } else {
            // Создаем новую запись
            $stmt = $this->db->prepare("
                INSERT INTO {$this->table} (employee_id, date, status) VALUES (?, ?, ?)
            ");
            return $stmt->execute([$employeeId, $date, $status]);
        }
    }

    public function bulkUpdate($employeeId, $startDate, $endDate, $status) {
        $dates = [];
        $currentDate = new DateTime($startDate);
        $end = new DateTime($endDate);

        while ($currentDate <= $end) {
            $dates[] = $currentDate->format('Y-m-d');
            $currentDate->modify('+1 day');
        }

        $this->db->beginTransaction();
        try {
            foreach ($dates as $date) {
                $this->updateStatus($employeeId, $date, $status);
            }
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function getEmployeeScheduleForPeriod($startDate, $endDate) {
        $stmt = $this->db->prepare("
            SELECT e.name, s.date, s.status, e.termination_date
            FROM employees e
            LEFT JOIN schedules s ON e.id = s.employee_id AND s.date BETWEEN ? AND ?
            ORDER BY e.name, s.date
        ");
        $stmt->execute([$startDate, $endDate]);
        
        $result = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result[] = $row;
        }
        return $result;
    }

    public function getActiveEmployees() {
        $stmt = $this->db->prepare("
            SELECT id, name 
            FROM employees 
            WHERE termination_date IS NULL 
            ORDER BY name
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteEmployeeRecords($employeeId, $deleteAll = false) {
        if ($deleteAll) {
            // Удалить все записи сотрудника
            $sql = "DELETE FROM {$this->table} WHERE employee_id = :employee_id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':employee_id', $employeeId);
        } else {
            // Удалить только записи текущего года (старая логика)
            $currentYear = date('Y');
            $startDate = $currentYear . '-01-01';
            $endDate = $currentYear . '-12-31';
            
            $sql = "DELETE FROM {$this->table} 
                    WHERE employee_id = :employee_id 
                    AND date BETWEEN :start_date AND :end_date";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':employee_id', $employeeId);
            $stmt->bindParam(':start_date', $startDate);
            $stmt->bindParam(':end_date', $endDate);
        }
        
        return $stmt->execute();
    }
}
?>