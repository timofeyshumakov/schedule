<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Deal.php';

class DealController
{
    private Deal $deal;

    public function __construct()
    {
        $this->deal = new Deal();
    }

    public function handle(string $method): void
    {
        switch ($method) {
            case 'GET':
                if (isset($_GET['start_date'], $_GET['end_date'])) {
                    $deals = $this->deal->getDealsForDateRange($_GET['start_date'], $_GET['end_date']);
                } else {
                    $deals = $this->deal->getAll();
                }
                echo json_encode(['success' => true, 'data' => $deals]);
                break;

            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (!isset($data['man_days'], $data['start_date'], $data['end_date'])) {
                    throw new Exception('All parameters are required');
                }
                if (!$this->deal->create($data['man_days'], $data['start_date'], $data['end_date'])) {
                    throw new Exception('Failed to create deal');
                }
                echo json_encode(['success' => true, 'message' => 'Deal created']);
                break;

            case 'DELETE':
                $data = json_decode(file_get_contents('php://input'), true) ?? [];
                if (!isset($data['id'])) {
                    throw new Exception('Deal ID is required');
                }
                if (!$this->deal->delete($data['id'])) {
                    throw new Exception('Failed to delete deal');
                }
                echo json_encode(['success' => true, 'message' => 'Deal deleted']);
                break;

            default:
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        }
    }
}
