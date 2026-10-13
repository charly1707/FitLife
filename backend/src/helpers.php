<?php

declare(strict_types=1);

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_out(string $message, int $status): never
{
    json_out(['message' => $message], $status);
}

function input(): array
{
    $raw = file_get_contents('php://input');
    $body = $raw ? json_decode($raw, true) : [];
    return is_array($body) ? $body : [];
}

function uid(string $prefix): string
{
    return $prefix . '_' . bin2hex(random_bytes(8));
}

function now_iso(?int $ts = null): string
{
    return date('c', $ts ?? time());
}

function iso_to_datetime(string $iso): string
{
    $ts = strtotime($iso);
    return $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
}

function round_f(float $n, int $precision = 2): float
{
    return round($n, $precision);
}

class ApiError extends \Exception
{
    public function __construct(string $message, public int $status = 400)
    {
        parent::__construct($message, $status);
    }
}