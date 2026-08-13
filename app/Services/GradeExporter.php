<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\ExerciseSubmission;
use App\Models\QcmAttempt;
use App\Models\Resource;
use App\Models\SchoolClass;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Construit le classeur de notes d'une classe : une ligne par élève, une colonne
 * par activité évaluée, plus une moyenne.
 *
 * Les résultats vivaient uniquement dans l'application, alors qu'un bulletin se
 * prépare ailleurs — ils étaient donc recopiés à la main.
 */
class GradeExporter
{
    public function build(SchoolClass $class): Spreadsheet
    {
        $students = Enrollment::where('class_id', $class->id)
            ->where('status', 'approved')
            ->with('student')
            ->get()
            ->pluck('student')
            ->filter()
            ->sortBy(fn ($student) => mb_strtolower($student->last_name . $student->first_name))
            ->values();

        $resources = Resource::query()
            ->whereHas('course.section', fn ($q) => $q->where('class_id', $class->id))
            ->with('course', 'exercise')
            ->orderBy('course_id')
            ->orderBy('order')
            ->get()
            ->filter(fn (Resource $r) => $r->file_type === 'qcm' || $r->exercise);

        // Deux requêtes pour toutes les notes, quel que soit l'effectif.
        $bestQcm = QcmAttempt::whereIn('resource_id', $resources->pluck('id'))
            ->get(['resource_id', 'student_id', 'score', 'max_score'])
            ->groupBy(fn ($a) => $a->resource_id . ':' . $a->student_id)
            ->map(fn ($attempts) => $attempts->sortByDesc(
                fn ($a) => $a->max_score > 0 ? $a->score / $a->max_score : 0
            )->first());

        $submissions = ExerciseSubmission::whereIn('exercise_id', $resources->pluck('exercise.id')->filter())
            ->get(['exercise_id', 'student_id', 'score', 'status'])
            ->keyBy(fn ($s) => $s->exercise_id . ':' . $s->student_id);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($class->name, 0, 31));

        $sheet->setCellValue('A1', 'Élève');
        $sheet->setCellValue('B1', 'Email');

        $column = 3;
        foreach ($resources as $resource) {
            $sheet->setCellValue([$column, 1], $resource->title);
            $sheet->setCellValue([$column, 2], $resource->course?->name);
            $column++;
        }
        $averageColumn = $column;
        $sheet->setCellValue([$averageColumn, 1], 'Moyenne /20');

        $row = 3;
        foreach ($students as $student) {
            $sheet->setCellValue("A{$row}", $student->full_name);
            $sheet->setCellValue("B{$row}", $student->email);

            $scores = [];
            $column = 3;

            foreach ($resources as $resource) {
                $value = $this->scoreFor($resource, $student->id, $bestQcm, $submissions);

                if ($value !== null) {
                    $scores[] = $value;
                    $sheet->setCellValue([$column, $row], round($value, 1));
                } else {
                    // Cellule vide plutôt que zéro : une activité non rendue n'est
                    // pas la même chose qu'une note de zéro.
                    $sheet->setCellValue([$column, $row], '');
                }

                $column++;
            }

            $sheet->setCellValue(
                [$averageColumn, $row],
                $scores ? round(array_sum($scores) / count($scores), 1) : ''
            );

            $row++;
        }

        $this->style($sheet, $averageColumn, $row - 1);

        return $spreadsheet;
    }

    public function toString(SchoolClass $class): string
    {
        $writer = new Xlsx($this->build($class));

        ob_start();
        $writer->save('php://output');

        return (string) ob_get_clean();
    }

    /** Note ramenée sur 20, ou null si l'élève n'a rien rendu. */
    private function scoreFor(Resource $resource, int $studentId, $bestQcm, $submissions): ?float
    {
        if ($resource->file_type === 'qcm') {
            $attempt = $bestQcm->get($resource->id . ':' . $studentId);

            return $attempt && $attempt->max_score > 0
                ? ($attempt->score / $attempt->max_score) * 20
                : null;
        }

        $exercise = $resource->exercise;

        if (!$exercise) {
            return null;
        }

        $submission = $submissions->get($exercise->id . ':' . $studentId);

        if (!$submission || $submission->status !== 'corrected' || $submission->score === null) {
            return null;
        }

        $max = $exercise->max_score ?: 20;

        return ($submission->score / $max) * 20;
    }

    private function style($sheet, int $averageColumn, int $lastRow): void
    {
        $lastColumn = $sheet->getHighestColumn();

        $sheet->getStyle("A1:{$lastColumn}2")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$lastColumn}2")->getAlignment()
            ->setVertical(Alignment::VERTICAL_BOTTOM)
            ->setWrapText(true);

        $averageLetter = $sheet->getCell([$averageColumn, 1])->getColumn();
        $sheet->getStyle("{$averageLetter}1:{$averageLetter}{$lastRow}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB('EFF3F7');
        $sheet->getStyle("{$averageLetter}3:{$averageLetter}{$lastRow}")->getFont()->setBold(true);

        $sheet->getColumnDimension('A')->setWidth(28);
        $sheet->getColumnDimension('B')->setWidth(30);
        $sheet->freezePane('C3');
    }
}
