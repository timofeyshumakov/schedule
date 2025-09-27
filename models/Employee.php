<?php
require_once '../config/database.php';

class Employee {
    private $db;
    private $table = 'employees';

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT * FROM {$this->table} ORDER BY name");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getActiveEmployees() {
        $stmt = $this->db->prepare("
            SELECT id, name, termination_date 
            FROM {$this->table} 
            WHERE termination_date IS NULL 
            ORDER BY name
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


    public function create($name) {
        $stmt = $this->db->prepare("INSERT INTO {$this->table} (name) VALUES (?)");
        return $stmt->execute([$name]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function terminate($id, $terminationDate) {
        $stmt = $this->db->prepare("
            UPDATE {$this->table} 
            SET termination_date = ? 
            WHERE id = ?
        ");
        return $stmt->execute([$terminationDate, $id]);
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>