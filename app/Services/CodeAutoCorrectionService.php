<?php

namespace App\Services;

use App\Models\Exercise;

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

    private function matchesRegex(string $code, string $pattern, string $flags = ''): bool
    {
        if ($pattern === '') {
            return false;
        }

        return @preg_match('/' . str_replace('/', '\/', $pattern) . '/' . $flags, $code) === 1;
    }
}
