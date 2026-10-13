<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\Notifier;

class LiveController
{
    public static function list(): void
    {
        $rows = db()->query('SELECT * FROM lives ORDER BY status = "live" DESC, scheduled_at')->fetchAll();
        json_out(array_map('FitLife\Controllers\live_payload', $rows));
    }

    public static function get(string $id): void
    {
        $st = db()->prepare('SELECT * FROM lives WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Live introuvable', 404);
        }
        json_out(live_payload($row));
    }

    public static function messages(string $id): void
    {
        self::get($id);
        $st = db()->prepare('SELECT * FROM live_messages WHERE live_id = ? ORDER BY created_at');
        $st->execute([$id]);
        json_out(array_map(function ($m) {
            return [
                'id' => $m['id'], 'liveId' => $m['live_id'], 'userId' => $m['user_id'],
                'userName' => $m['user_name'], 'avatarUrl' => $m['avatar_url'], 'text' => $m['text'],
                'createdAt' => date('c', strtotime($m['created_at'])),
                'isCoach' => (bool) $m['is_coach'], 'isQuestion' => (bool) $m['is_question'],
            ];
        }, $st->fetchAll()));
    }

    public static function sendMessage(string $id, array $body): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        $staff = in_array($user['role'], ['coach', 'admin', 'superadmin'], true);
        // Offre : le chat avec le coach pendant les lives est réservé au Premium.
        if (!$staff && !(int) $user['is_premium']) {
            throw new ApiError('Le chat des lives est réservé aux membres Premium', 403);
        }
        $live = self::get_live($id);
        if ($live['status'] !== 'live') {
            throw new ApiError('Le chat est ouvert uniquement pendant le direct', 409);
        }
        $text = mb_substr(trim((string) ($body['text'] ?? '')), 0, 500);
        if ($text === '') {
            throw new ApiError('Message vide', 400);
        }
        $msgId = uid('lm');
        $name = $staff ? trim($user['first_name'] . ' ' . $user['last_name']) : $user['first_name'];
        $isQuestion = !$staff && !empty($body['isQuestion']);
        db()->prepare('INSERT INTO live_messages (id, live_id, user_id, user_name, avatar_url, text, is_coach, is_question) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$msgId, $id, $auth['uid'], $name, $user['avatar_url'], $text, $staff ? 1 : 0, $isQuestion ? 1 : 0]);
        json_out([
            'id' => $msgId, 'liveId' => $id, 'userId' => $auth['uid'], 'userName' => $name,
            'avatarUrl' => $user['avatar_url'], 'text' => $text, 'createdAt' => now_iso(),
            'isCoach' => $staff, 'isQuestion' => $isQuestion,
        ], 201);
    }

    public static function create(array $body): void
    {
        $auth = require_staff();
        $u = AuthController::user_row($auth['uid']);
        $id = uid('live');
        $coachId = $body['coachId'] ?? 'coach_awa';
        $coachName = $body['coachName'] ?? ($u['role'] === 'coach' ? trim($u['first_name'] . ' ' . $u['last_name']) : 'Coach Awa');
        $level = in_array($body['level'] ?? '', ['beginner', 'intermediate', 'advanced'], true) ? $body['level'] : 'beginner';
        $minutes = max(1, (int) ($body['durationMinutes'] ?? 30));
        $scheduledAt = isset($body['scheduledAt']) ? iso_to_datetime((string) $body['scheduledAt']) : date('Y-m-d H:i:s', time() + 86400);
        // « Lancer maintenant » : le live démarre immédiatement.
        $startNow = ($body['status'] ?? '') === 'live';
        if ($startNow) {
            $scheduledAt = date('Y-m-d H:i:s');
        }
        $title = (string) ($body['title'] ?? 'Nouveau live');
        db()->prepare(
            'INSERT INTO lives (id, coach_id, coach_name, title, description, status, scheduled_at, duration_minutes, viewers, level, premium_only, stream_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $coachId, $coachName, $title,
            (string) ($body['description'] ?? ''), $startNow ? 'live' : 'scheduled', $scheduledAt, $minutes,
            $startNow ? 1 : 0, $level, (int) ($body['premiumOnly'] ?? 0), self::streamUrl($body['streamUrl'] ?? null),
        ]);
        Notifier::broadcast(
            $auth['uid'],
            'live',
            $startNow ? "$coachName est en direct" : "Nouveau live programmé : $title",
            $startNow ? "$title vient de commencer. Rejoins la séance !" : 'Le ' . Notifier::longDate($scheduledAt) . '.'
        );
        json_out(self::get_live($id), 201);
    }

    public static function setStatus(string $id, array $body): void
    {
        require_staff();
        $status = $body['status'] ?? '';
        if (!in_array($status, ['scheduled', 'live', 'ended'], true)) {
            throw new ApiError('Statut invalide', 400);
        }
        $viewers = $status === 'live' ? 'GREATEST(viewers, 1)' : 'viewers';
        db()->prepare("UPDATE lives SET status = ?, viewers = $viewers WHERE id = ?")->execute([$status, $id]);
        json_out(self::get_live($id));
    }

    public static function update(string $id, array $body): void
    {
        require_staff();
        self::get_live($id);
        $map = [];
        if (array_key_exists('title', $body)) {
            $title = trim((string) $body['title']);
            if ($title === '') {
                throw new ApiError('Le titre est obligatoire', 400);
            }
            $map['title'] = mb_substr($title, 0, 160);
        }
        if (array_key_exists('description', $body)) {
            $map['description'] = mb_substr((string) $body['description'], 0, 255);
        }
        if (array_key_exists('scheduledAt', $body)) {
            $map['scheduled_at'] = iso_to_datetime((string) $body['scheduledAt']);
        }
        if (array_key_exists('durationMinutes', $body)) {
            $map['duration_minutes'] = max(1, (int) $body['durationMinutes']);
        }
        if (array_key_exists('level', $body) && in_array($body['level'], ['beginner', 'intermediate', 'advanced'], true)) {
            $map['level'] = $body['level'];
        }
        if (array_key_exists('premiumOnly', $body)) {
            $map['premium_only'] = !empty($body['premiumOnly']) ? 1 : 0;
        }
        if (array_key_exists('streamUrl', $body)) {
            $map['stream_url'] = self::streamUrl($body['streamUrl']);
        }
        if (array_key_exists('coachName', $body) && trim((string) $body['coachName']) !== '') {
            $map['coach_name'] = mb_substr(trim((string) $body['coachName']), 0, 60);
            $map['coach_id'] = mb_substr((string) ($body['coachId'] ?? 'coach_awa'), 0, 20);
        }
        if ($map) {
            $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($map)));
            db()->prepare("UPDATE lives SET $sets WHERE id = ?")->execute([...array_values($map), $id]);
        }
        json_out(self::get_live($id));
    }

    public static function delete(string $id): void
    {
        require_staff();
        db()->prepare('DELETE FROM lives WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    /** Lien http(s) uniquement (pas de javascript:, data:…). */
    private static function streamUrl(mixed $url): ?string
    {
        $url = trim((string) ($url ?? ''));
        if ($url === '') {
            return null;
        }
        if (!preg_match('#^https?://#i', $url) || filter_var($url, FILTER_VALIDATE_URL) === false) {
            throw new ApiError('Lien du direct invalide (https://…)', 400);
        }
        return mb_substr($url, 0, 500);
    }

    private static function get_live(string $id): array
    {
        $st = db()->prepare('SELECT * FROM lives WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Live introuvable', 404);
        }
        return live_payload($row);
    }
}

function live_payload(array $l): array
{
    return [
        'id' => $l['id'],
        'coachId' => $l['coach_id'],
        'coachName' => $l['coach_name'],
        'coachAvatarUrl' => $l['coach_avatar_url'],
        'title' => $l['title'],
        'description' => $l['description'],
        'status' => $l['status'],
        'scheduledAt' => date('c', strtotime($l['scheduled_at'])),
        'durationMinutes' => (int) $l['duration_minutes'],
        'viewers' => (int) $l['viewers'],
        'level' => $l['level'],
        'premiumOnly' => (bool) $l['premium_only'],
        'thumbnailUrl' => $l['thumbnail_url'],
        'streamUrl' => $l['stream_url'] ?? null,
    ];
}