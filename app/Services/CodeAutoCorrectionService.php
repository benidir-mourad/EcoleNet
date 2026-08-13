<?php

namespace App\Services;

use App\Models\Exercise;
use Illuminate\Support\Facades\Log;

class CodeAutoCorrectionService
{
    public function evaluate(Exercise $exercise, string $code): array
    {
        $tests = collect($exercise->content['tests'] ?? []);
        $results = [];
        $score = 0;
        $maxScore = 0;

        foreach ($tests as $index => $test) {
            $points = max((int) ($test['points'] ?? 1), 1);
            $maxScore += $points;

            $passed = $this->passes($code, $test);
            if ($passed) {
                $score += $points;
            }

            $results[] = [
                'index' => $index,
                'label' => $test['label'] ?? 'Test ' . ($index + 1),
                'type' => $test['type'] ?? 'contains',
                'passed' => $passed,
                'points' => $points,
                'earned' => $passed ? $points : 0,
                'feedback' => $passed
                    ? ($test['success_feedback'] ?? 'Reussi.')
                    : ($test['failure_feedback'] ?? 'Condition non respectee.'),
            ];
        }

        return [
            'score' => $score,
            'max_score' => max($maxScore, 1),
            'percentage' => $maxScore > 0 ? round(($score / $maxScore) * 100) : 0,
            'results' => $results,
        ];
    }

    private function passes(string $code, array $test): bool
    {
        return match ($test['type'] ?? 'contains') {
            'not_contains' => !$this->contains($code, $test),
            'regex' => $this->matchesRegex($code, $test['pattern'] ?? $test['value'] ?? ''),
            'html_tag' => $this->matchesRegex($code, '<\s*' . preg_quote($test['value'] ?? '', '/') . '(\s|>|/)', 'i'),
            'html_attribute' => $this->hasHtmlAttribute($code, $test),
            'css_selector' => $this->matchesRegex($code, preg_quote($test['value'] ?? '', '/') . '\s*\{', 'i'),
            'css_property' => $this->hasCssProperty($code, $test),
            'js_function' => $this->matchesRegex($code, 'function\s+' . preg_quote($test['value'] ?? '', '/') . '\s*\(', 'i')
                || $this->matchesRegex($code, '(const|let|var)\s+' . preg_quote($test['value'] ?? '', '/') . '\s*=', 'i'),
            'sql_clause' => $this->hasSqlClause($code, $test),
            'sql_table' => $this->hasSqlTable($code, $test),
            'sql_column' => $this->hasSqlColumn($code, $test),
            'sql_where_condition' => $this->hasSqlWhereCondition($code, $test),
            'sql_order_by' => $this->hasSqlOrderBy($code, $test),
            'sql_join' => $this->hasSqlJoin($code, $test),
            default => $this->contains($code, $test),
        };
    }

    private function contains(string $code, array $test): bool
    {
        $value = (string) ($test['value'] ?? '');
        if ($value === '') {
            return false;
        }

        if ($test['case_sensitive'] ?? false) {
            return str_contains($code, $value);
        }

        return str_contains(mb_strtolower($code), mb_strtolower($value));
    }

    private function hasHtmlAttribute(string $code, array $test): bool
    {
        $tag = preg_quote($test['value'] ?? '', '/');
        $attribute = preg_quote($test['attribute'] ?? $test['property'] ?? '', '/');

        if ($tag === '' || $attribute === '') {
            return false;
        }

        return $this->matchesRegex($code, '<\s*' . $tag . '\b[^>]*\b' . $attribute . '(\s*=\s*["\'][^"\']*["\'])?', 'i');
    }

    private function hasCssProperty(string $code, array $test): bool
    {
        $selector = preg_quote($test['selector'] ?? $test['value'] ?? '', '/');
        $property = preg_quote($test['property'] ?? '', '/');
        $expected = trim((string) ($test['expected'] ?? ''));

        if ($selector === '' || $property === '') {
            return false;
        }

        $valuePattern = $expected !== '' ? '\s*:\s*' . preg_quote($expected, '/') : '\s*:';

        return $this->matchesRegex($code, $selector . '\s*\{[^}]*\b' . $property . $valuePattern, 'is');
    }

    private function hasSqlClause(string $code, array $test): bool
    {
        $clause = $this->normalizeSqlName($test['value'] ?? '');

        if ($clause === '') {
            return false;
        }

        return $this->matchesRegex($this->normalizeSql($code), '\b' . preg_quote($clause, '/') . '\b', 'i');
    }

    private function hasSqlTable(string $code, array $test): bool
    {
        $table = $this->normalizeSqlName($test['value'] ?? '');

        if ($table === '') {
            return false;
        }

        return $this->matchesRegex($this->normalizeSql($code), '\b(from|join|into|update)\s+`?' . preg_quote($table, '/') . '`?\b', 'i');
    }

    private function hasSqlColumn(string $code, array $test): bool
    {
        $column = $this->normalizeSqlName($test['value'] ?? '');

        if ($column === '') {
            return false;
        }

        return $this->matchesRegex($this->normalizeSql($code), '(^|[\s,(`.])`?' . preg_quote($column, '/') . '`?($|[\s,).=])', 'i');
    }

    private function hasSqlWhereCondition(string $code, array $test): bool
    {
        $sql = $this->normalizeSql($code);
        $column = $this->normalizeSqlName($test['value'] ?? '');
        $operator = $this->normalizeSqlOperator($test['property'] ?? '=');
        $expected = trim((string) ($test['expected'] ?? ''));

        if ($column === '') {
            return false;
        }

        $whereSegment = '\bwhere\b(?:(?!\b(group\s+by|order\s+by|limit|having)\b).)*';
        $columnPattern = '(`?' . preg_quote($column, '/') . '`?|\w+\.`?' . preg_quote($column, '/') . '`?)';

        if ($expected === '') {
            return $this->matchesRegex($sql, $whereSegment . $columnPattern, 'i');
        }

        return $this->matchesRegex($sql, $whereSegment . $columnPattern . '\s*' . preg_quote($operator, '/') . '\s*' . $this->sqlValuePattern($expected), 'i');
    }

    private function hasSqlOrderBy(string $code, array $test): bool
    {
        $sql = $this->normalizeSql($code);
        $column = $this->normalizeSqlName($test['value'] ?? '');
        $direction = strtoupper(trim((string) ($test['expected'] ?? '')));

        if ($column === '') {
            return false;
        }

        $columnPattern = '(`?' . preg_quote($column, '/') . '`?|\w+\.`?' . preg_quote($column, '/') . '`?)';
        $directionPattern = in_array($direction, ['ASC', 'DESC'], true) ? '\s+' . $direction : '';

        return $this->matchesRegex($sql, '\border\s+by\b[^;]*' . $columnPattern . $directionPattern, 'i');
    }

    private function hasSqlJoin(string $code, array $test): bool
    {
        $sql = $this->normalizeSql($code);
        $table = $this->normalizeSqlName($test['value'] ?? '');
        $expected = trim((string) ($test['expected'] ?? ''));

        if ($table === '') {
            return false;
        }

        $joinPattern = '\b(left|right|inner|outer|full|cross)?\s*join\s+`?' . preg_quote($table, '/') . '`?\b';

        if ($expected === '') {
            return $this->matchesRegex($sql, $joinPattern, 'i');
        }

        return $this->matchesRegex($sql, $joinPattern . '(?:(?!\b(left|right|inner|outer|full|cross)?\s*join\b).)*\bon\b(?:(?!\bwhere\b|\bgroup\s+by\b|\border\s+by\b).)*' . preg_quote($expected, '/'), 'i');
    }

    private function normalizeSql(string $code): string
    {
        $withoutLineComments = preg_replace('/--.*$/m', ' ', $code) ?? $code;
        $withoutBlockComments = preg_replace('/\/\*.*?\*\//s', ' ', $withoutLineComments) ?? $withoutLineComments;

        return preg_replace('/\s+/', ' ', trim($withoutBlockComments)) ?? trim($withoutBlockComments);
    }

    private function normalizeSqlName(string $name): string
    {
        return trim(str_replace(['`', '"', '[', ']'], '', $name));
    }

    private function normalizeSqlOperator(string $operator): string
    {
        $operator = strtoupper(trim($operator));

        return in_array($operator, ['=', '!=', '<>', '>', '<', '>=', '<=', 'LIKE'], true) ? $operator : '=';
    }

    private function sqlValuePattern(string $value): string
    {
        $escaped = preg_quote(trim($value, "'\"` "), '/');

        return '["\']?' . $escaped . '["\']?';
    }

    /**
     * Le motif vient des règles de correction saisies par l'enseignant. Un motif à
     * retour arrière catastrophique appliqué au code d'un élève pourrait bloquer le
     * processus PHP : la limite ci-dessous fait échouer le motif plutôt que de le
     * laisser tourner, et l'échec est journalisé au lieu d'être avalé.
     */
    private function matchesRegex(string $code, string $pattern, string $flags = ''): bool
    {
        if ($pattern === '') {
            return false;
        }

        $previousBacktrack = ini_get('pcre.backtrack_limit');
        $previousRecursion = ini_get('pcre.recursion_limit');

        ini_set('pcre.backtrack_limit', '100000');
        ini_set('pcre.recursion_limit', '10000');

        try {
            $result = @preg_match('/' . str_replace('/', '\/', $pattern) . '/' . $flags, $code);

            if ($result === false) {
                Log::warning('Règle de correction ignorée : motif invalide ou trop coûteux.', [
                    'pattern' => $pattern,
                    'error'   => preg_last_error_msg(),
                ]);
            }

            return $result === 1;
        } finally {
            ini_set('pcre.backtrack_limit', $previousBacktrack);
            ini_set('pcre.recursion_limit', $previousRecursion);
        }
    }
}
