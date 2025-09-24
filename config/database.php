<?php
class Database {
    private $pdo;
    private $db_file = '../database.sqlite';

    public function __construct() {
        try {
            $this->pdo = new PDO('sqlite:' . $this->db_file);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->createTables();
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }

    private function createTables() {
        // Таблица сотрудников
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Таблица графиков
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER,
                date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('working', 'vacation', 'sick', 'weekend')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, date),
                FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
            )
        ");

        // Таблица сделок
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS deals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                man_days INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
    }

    public function getConnection() {
        return $this->pdo;
    }
}
?>