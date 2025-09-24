<?php
require_once '../config/database.php';

class Deal {
    private $db;
    private $table = 'deals';

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function create($manDays, $startDate, $endDate) {
        $stmt = $this->db->prepare("
            INSERT INTO {$this->table} (man_days, start_date, end_date) 
            VALUES (?, ?, ?)
        ");
        return $stmt->execute([$manDays, $startDate, $endDate]);
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT * FROM {$this->table} ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getDealsForDateRange($startDate, $endDate) {
        $stmt = $this->db->prepare("
            SELECT * FROM {$this->table} 
            WHERE start_date <= ? AND end_date >= ?
            ORDER BY start_date
        ");
        $stmt->execute([$endDate, $startDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>