<?php
class Database {
    private $pdo;
    private $db_file = '../database.sqlite';

    public function __construct() {
        try {
            $this->pdo = new PDO('sqlite:' . $this->db_file);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->createTables();
            $this->checkAndMigrate(); // Добавляем проверку миграций
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }
    
    private function checkAndMigrate() {
        try {
            // Проверяем существование столбца termination_date в таблице employees
            $checkSql = "PRAGMA table_info(employees)";
            $stmt = $this->pdo->prepare($checkSql);
            $stmt->execute();
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $columnExists = false;
            foreach ($columns as $column) {
                if ($column['name'] === 'termination_date') {
                    $columnExists = true;
                    break;
                }
            }
            
            if (!$columnExists) {
                // Столбец не существует, выполняем миграцию
                $alterSql = "ALTER TABLE employees ADD COLUMN termination_date DATE NULL";
                $this->pdo->exec($alterSql);
                error_log("Миграция базы данных: добавлен столбец termination_date");
                
                // Создаем индекс для улучшения производительности
                $indexSql = "CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date)";
                $this->pdo->exec($indexSql);
            }
            
            // Проверяем другие возможные миграции...
            $this->checkAdditionalMigrations();
            
        } catch (Exception $e) {
            error_log("Ошибка при проверке миграции: " . $e->getMessage());
        }
    }
    
    private function checkAdditionalMigrations() {
        try {
            // Проверяем существование таблицы для отслеживания миграций (опционально)
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT NOT NULL UNIQUE,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ");
            
            // Список выполненных миграций
            $migrations = [];
            $stmt = $this->pdo->prepare("SELECT migration_name FROM migrations");
            $stmt->execute();
            $executedMigrations = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // Миграция для добавления termination_date
            if (!in_array('add_termination_date', $executedMigrations)) {
                // Проверяем еще раз, чтобы избежать дублирования
                $checkSql = "PRAGMA table_info(employees)";
                $stmt = $this->pdo->prepare($checkSql);
                $stmt->execute();
                $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $columnExists = false;
                foreach ($columns as $column) {
                    if ($column['name'] === 'termination_date') {
                        $columnExists = true;
                        break;
                    }
                }
                
                if (!$columnExists) {
                    $alterSql = "ALTER TABLE employees ADD COLUMN termination_date DATE NULL";
                    $this->pdo->exec($alterSql);
                    
                    // Создаем индекс
                    $indexSql = "CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date)";
                    $this->pdo->exec($indexSql);
                    
                    // Записываем миграцию в историю
                    $stmt = $this->pdo->prepare("INSERT INTO migrations (migration_name) VALUES (?)");
                    $stmt->execute(['add_termination_date']);
                    
                    error_log("Миграция выполнена: добавлен столбец termination_date");
                }
            }
            
        } catch (Exception $e) {
            error_log("Ошибка при проверке дополнительных миграций: " . $e->getMessage());
        }
    }

    private function createTables() {
        // Таблица сотрудников (обновленная структура)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                termination_date DATE NULL,
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
        
        // Таблица для отслеживания миграций (опционально)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT NOT NULL UNIQUE,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
    }

    public function getConnection() {
        return $this->pdo;
    }
    
    // Метод для принудительного выполнения миграций (для отладки)
    public function runMigrations() {
        $this->checkAndMigrate();
    }
}
?>