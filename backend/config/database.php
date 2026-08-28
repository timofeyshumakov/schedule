<?php
class Database {
    private $pdo;
    private $db_file;

    public function __construct() {
        try {
            $this->db_file = __DIR__ . '/../database.sqlite';
            $this->pdo = new PDO('sqlite:' . $this->db_file);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->createTables();
            $this->checkAndMigrate(); // Р”РѕР±Р°РІР»СЏРµРј РїСЂРѕРІРµСЂРєСѓ РјРёРіСЂР°С†РёР№
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }
    
    private function checkAndMigrate() {
        try {
            // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ СЃС‚РѕР»Р±С†Р° termination_date РІ С‚Р°Р±Р»РёС†Рµ employees
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
                // РЎС‚РѕР»Р±РµС† РЅРµ СЃСѓС‰РµСЃС‚РІСѓРµС‚, РІС‹РїРѕР»РЅСЏРµРј РјРёРіСЂР°С†РёСЋ
                $alterSql = "ALTER TABLE employees ADD COLUMN termination_date DATE NULL";
                $this->pdo->exec($alterSql);
                error_log("РњРёРіСЂР°С†РёСЏ Р±Р°Р·С‹ РґР°РЅРЅС‹С…: РґРѕР±Р°РІР»РµРЅ СЃС‚РѕР»Р±РµС† termination_date");
                
                // РЎРѕР·РґР°РµРј РёРЅРґРµРєСЃ РґР»СЏ СѓР»СѓС‡С€РµРЅРёСЏ РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЊРЅРѕСЃС‚Рё
                $indexSql = "CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date)";
                $this->pdo->exec($indexSql);
            }
            
            // РџСЂРѕРІРµСЂСЏРµРј РґСЂСѓРіРёРµ РІРѕР·РјРѕР¶РЅС‹Рµ РјРёРіСЂР°С†РёРё...
            $this->checkAdditionalMigrations();
            
        } catch (Exception $e) {
            error_log("РћС€РёР±РєР° РїСЂРё РїСЂРѕРІРµСЂРєРµ РјРёРіСЂР°С†РёРё: " . $e->getMessage());
        }
    }
    
    private function checkAdditionalMigrations() {
        try {
            // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ С‚Р°Р±Р»РёС†С‹ РґР»СЏ РѕС‚СЃР»РµР¶РёРІР°РЅРёСЏ РјРёРіСЂР°С†РёР№ (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT NOT NULL UNIQUE,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ");
            
            // РЎРїРёСЃРѕРє РІС‹РїРѕР»РЅРµРЅРЅС‹С… РјРёРіСЂР°С†РёР№
            $migrations = [];
            $stmt = $this->pdo->prepare("SELECT migration_name FROM migrations");
            $stmt->execute();
            $executedMigrations = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // РњРёРіСЂР°С†РёСЏ РґР»СЏ РґРѕР±Р°РІР»РµРЅРёСЏ termination_date
            if (!in_array('add_termination_date', $executedMigrations)) {
                // РџСЂРѕРІРµСЂСЏРµРј РµС‰Рµ СЂР°Р·, С‡С‚РѕР±С‹ РёР·Р±РµР¶Р°С‚СЊ РґСѓР±Р»РёСЂРѕРІР°РЅРёСЏ
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
                    
                    // РЎРѕР·РґР°РµРј РёРЅРґРµРєСЃ
                    $indexSql = "CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date)";
                    $this->pdo->exec($indexSql);
                    
                    // Р—Р°РїРёСЃС‹РІР°РµРј РјРёРіСЂР°С†РёСЋ РІ РёСЃС‚РѕСЂРёСЋ
                    $stmt = $this->pdo->prepare("INSERT INTO migrations (migration_name) VALUES (?)");
                    $stmt->execute(['add_termination_date']);
                    
                    error_log("РњРёРіСЂР°С†РёСЏ РІС‹РїРѕР»РЅРµРЅР°: РґРѕР±Р°РІР»РµРЅ СЃС‚РѕР»Р±РµС† termination_date");
                }
            }
            
        } catch (Exception $e) {
            error_log("РћС€РёР±РєР° РїСЂРё РїСЂРѕРІРµСЂРєРµ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹С… РјРёРіСЂР°С†РёР№: " . $e->getMessage());
        }
    }

    private function createTables() {
        // РўР°Р±Р»РёС†Р° СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ (РѕР±РЅРѕРІР»РµРЅРЅР°СЏ СЃС‚СЂСѓРєС‚СѓСЂР°)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                termination_date DATE NULL,
                created_at DATE DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // РўР°Р±Р»РёС†Р° РіСЂР°С„РёРєРѕРІ
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER,
                date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('working', 'vacation', 'sick', 'weekend', 'terminated', 'not_hired')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, date),
                FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
            )
        ");

        // РўР°Р±Р»РёС†Р° СЃРґРµР»РѕРє
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS deals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                man_days INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // РўР°Р±Р»РёС†Р° РґР»СЏ РѕС‚СЃР»РµР¶РёРІР°РЅРёСЏ РјРёРіСЂР°С†РёР№ (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)
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
    
    // РњРµС‚РѕРґ РґР»СЏ РїСЂРёРЅСѓРґРёС‚РµР»СЊРЅРѕРіРѕ РІС‹РїРѕР»РЅРµРЅРёСЏ РјРёРіСЂР°С†РёР№ (РґР»СЏ РѕС‚Р»Р°РґРєРё)
    public function runMigrations() {
        $this->checkAndMigrate();
    }
}
?>
