<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\QcmOption;
use App\Models\QcmQuestion;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExerciseController extends Controller
{
    // ── QCM ──────────────────────────────────────────────────────────────────

    public function getQcm(Resource $resource)
    {
        $questions = $resource->qcmQuestions()->with('options')->get();
        return response()->json(['questions' => $questions]);
    }

    public function saveQcm(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'questions'                        => 'required|array|min:1',
            'questions.*.question'             => 'required|string',
            'questions.*.points'               => 'integer|min:1',
            'questions.*.explanation'          => 'nullable|string',
            'questions.*.options'              => 'required|array|min:2',
            'questions.*.options.*.label'      => 'required|string',
            'questions.*.options.*.is_correct' => 'required|boolean',
        ]);

        $resource->qcmQuestions()->delete();

        foreach ($data['questions'] as $qIndex => $qData) {
            $question = QcmQuestion::create([
                'resource_id' => $resource->id,
                'question'    => $qData['question'],
                'order'       => $qIndex,
                'points'      => $qData['points'] ?? 1,
                'explanation' => $qData['explanation'] ?? null,
            ]);

            foreach ($qData['options'] as $oIndex => $oData) {
                QcmOption::create([
                    'question_id' => $question->id,
                    'label'       => $oData['label'],
                    'is_correct'  => $oData['is_correct'],
                    'order'       => $oIndex,
                ]);
            }
        }

        $resource->update(['file_type' => 'qcm']);

        return response()->json([
            'questions' => $resource->qcmQuestions()->with('options')->get(),
        ]);
    }

    // ── Drag & Drop ──────────────────────────────────────────────────────────

    public function getDragDrop(Resource $resource)
    {
        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveDragDrop(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'title'        => 'required|string|max:200',
            'instructions' => 'nullable|string|max:1000',
            'pairs'        => 'required|array|min:2',
            'pairs.*.left' => 'required|string|max:200',
            'pairs.*.right'=> 'required|string|max:200',
        ]);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $data['title'],
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'drag_drop',
                'content'      => ['pairs' => $data['pairs']],
                'max_score'    => count($data['pairs']),
                'auto_correct' => true,
            ]
        );

        $resource->update(['file_type' => 'drag_drop']);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptDragDrop(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'answers'         => 'required|array',
            'answers.*.left'  => 'required|string',
            'answers.*.right' => 'required|string',
        ]);

        $exercise = $resource->exercise;
        if (!$exercise || $exercise->type !== 'drag_drop') {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        $pairs   = collect($exercise->content['pairs'] ?? []);
        $answers = collect($data['answers']);
        $results = [];
        $score   = 0;

        foreach ($pairs as $pair) {
            $given   = $answers->firstWhere('left', $pair['left']);
            $correct = $given && $given['right'] === $pair['right'];
            if ($correct) $score++;
            $results[] = [
                'left'          => $pair['left'],
                'right_correct' => $pair['right'],
                'right_given'   => $given['right'] ?? null,
                'is_correct'    => $correct,
            ];
        }

        ExerciseSubmission::create([
            'exercise_id'  => $exercise->id,
            'student_id'   => $request->user()->id,
            'content'      => json_encode($data['answers']),
            'score'        => $score,
            'status'       => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        return response()->json([
            'score'     => $score,
            'max_score' => $pairs->count(),
            'results'   => $results,
        ]);
    }

    // ── Fill Blanks ───────────────────────────────────────────────────────────

    public function getFillBlanks(Resource $resource)
    {
        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveFillBlanks(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'title'          => 'required|string|max:200',
            'template'       => 'required|string',
            'case_sensitive' => 'boolean',
            'instructions'   => 'nullable|string|max:2000',
        ]);

        // Count blanks to determine max_score
        preg_match_all('/\[\[(.*?)\]\]/', $data['template'], $matches);
        $blankCount = count($matches[0]);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $data['title'],
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'fill_blanks',
                'content'      => [
                    'template'       => $data['template'],
                    'case_sensitive' => $data['case_sensitive'] ?? false,
                ],
                'max_score'    => max($blankCount, 1),
                'auto_correct' => true,
            ]
        );

        $resource->update(['file_type' => 'fill_blanks']);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptFillBlanks(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'answers'   => 'required|array',
            'answers.*' => 'nullable|string',
        ]);

        $exercise = $resource->exercise;
        if (!$exercise || $exercise->type !== 'fill_blanks') {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        $template      = $exercise->content['template'] ?? '';
        $caseSensitive = $exercise->content['case_sensitive'] ?? false;

        preg_match_all('/\[\[(.*?)\]\]/', $template, $matches);
        $correctAnswers = $matches[1];

        $results = [];
        $score   = 0;

        foreach ($correctAnswers as $i => $correct) {
            $given     = $data['answers'][$i] ?? '';
            $isCorrect = $caseSensitive
                ? trim($given) === trim($correct)
                : strtolower(trim($given)) === strtolower(trim($correct));

            if ($isCorrect) $score++;
            $results[] = [
                'index'          => $i,
                'given'          => $given,
                'correct_answer' => $correct,
                'is_correct'     => $isCorrect,
            ];
        }

        ExerciseSubmission::create([
            'exercise_id'  => $exercise->id,
            'student_id'   => $request->user()->id,
            'content'      => json_encode($data['answers']),
            'score'        => $score,
            'status'       => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        return response()->json([
            'score'     => $score,
            'max_score' => count($correctAnswers),
            'results'   => $results,
        ]);
    }

    // ── Ordering ──────────────────────────────────────────────────────────────

    public function getOrdering(Resource $resource)
    {
        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveOrdering(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'title'        => 'required|string|max:200',
            'instructions' => 'nullable|string|max:2000',
            'items'        => 'required|array|min:2',
            'items.*'      => 'required|string',
        ]);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $data['title'],
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'ordering',
                'content'      => ['items' => $data['items']],
                'max_score'    => count($data['items']),
                'auto_correct' => true,
            ]
        );

        $resource->update(['file_type' => 'ordering']);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptOrdering(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer',
        ]);

        $exercise = $resource->exercise;
        if (!$exercise || $exercise->type !== 'ordering') {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        $items        = $exercise->content['items'] ?? [];
        $correctOrder = range(0, count($items) - 1);
        $studentOrder = $data['order'];
        $score        = 0;
        $results      = [];

        foreach ($correctOrder as $pos => $correctIdx) {
            $given     = $studentOrder[$pos] ?? -1;
            $isCorrect = (int) $given === $correctIdx;
            if ($isCorrect) $score++;
            $results[] = [
                'position'      => $pos,
                'correct_item'  => $items[$correctIdx] ?? '',
                'given_item'    => $items[$given] ?? '',
                'is_correct'    => $isCorrect,
            ];
        }

        ExerciseSubmission::create([
            'exercise_id'  => $exercise->id,
            'student_id'   => $request->user()->id,
            'content'      => json_encode($data['order']),
            'score'        => $score,
            'status'       => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        return response()->json([
            'score'     => $score,
            'max_score' => count($items),
            'results'   => $results,
        ]);
    }

    // ── Code Editor ───────────────────────────────────────────────────────────

    public function getCodeEditor(Resource $resource)
    {
        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveCodeEditor(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'title'           => 'required|string|max:200',
            'instructions'    => 'nullable|string|max:100000',
            'language'        => 'required|string|in:javascript,html,css,php,sql,python,text',
            'starter_code'    => 'nullable|string',
            'expected_output' => 'nullable|string',
            'max_score'       => 'nullable|integer|min:1|max:100',
            'deadline'        => 'nullable|date',
        ]);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $data['title'],
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'code_editor',
                'content'      => [
                    'language'        => $data['language'],
                    'starter_code'    => $data['starter_code'] ?? '',
                    'expected_output' => $data['expected_output'] ?? null,
                ],
                'max_score'    => $data['max_score'] ?? 20,
                'auto_correct' => false,
                'deadline'     => $data['deadline'] ?? null,
            ]
        );

        $resource->update(['file_type' => 'code_editor']);

        return response()->json(['exercise' => $exercise]);
    }

    // ── Truth Table ───────────────────────────────────────────────────────────

    public function getTruthTable(Resource $resource)
    {
        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveTruthTable(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'title'                       => 'required|string|max:200',
            'instructions'                => 'nullable|string|max:2000',
            'variables'                   => 'required|array|min:1|max:4',
            'variables.*'                 => 'required|string|max:10',
            'output_labels'               => 'required|array|min:1',
            'output_labels.*'             => 'required|string|max:50',
            'rows'                        => 'required|array|min:1',
            'rows.*.inputs'               => 'required|array',
            'rows.*.inputs.*'             => 'required|integer|in:0,1',
            'rows.*.outputs'              => 'required|array',
            'rows.*.outputs.*'            => 'required|integer|in:0,1',
        ]);

        $totalCells = count($data['rows']) * count($data['output_labels']);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $data['title'],
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'truth_table',
                'content'      => [
                    'variables'     => $data['variables'],
                    'output_labels' => $data['output_labels'],
                    'rows'          => $data['rows'],
                ],
                'max_score'    => $totalCells,
                'auto_correct' => true,
            ]
        );

        $resource->update(['file_type' => 'truth_table']);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptTruthTable(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'answers'     => 'required|array',
            'answers.*'   => 'required|array',
            'answers.*.*' => 'required|integer|in:0,1',
        ]);

        $exercise = $resource->exercise;
        if (!$exercise || $exercise->type !== 'truth_table') {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        $rows    = $exercise->content['rows'] ?? [];
        $score   = 0;
        $total   = 0;
        $results = [];

        foreach ($rows as $rIdx => $row) {
            $rowResults = [];
            foreach ($row['outputs'] as $oIdx => $correct) {
                $given     = $data['answers'][$rIdx][$oIdx] ?? -1;
                $isCorrect = (int) $given === (int) $correct;
                if ($isCorrect) $score++;
                $total++;
                $rowResults[] = ['given' => $given, 'correct' => $correct, 'is_correct' => $isCorrect];
            }
            $results[] = $rowResults;
        }

        ExerciseSubmission::create([
            'exercise_id'  => $exercise->id,
            'student_id'   => $request->user()->id,
            'content'      => json_encode($data['answers']),
            'score'        => $score,
            'status'       => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        return response()->json([
            'score'     => $score,
            'max_score' => $total,
            'results'   => $results,
        ]);
    }

    // ── Template file ─────────────────────────────────────────────────────────

    public function uploadTemplate(Request $request, Resource $resource)
    {
        $request->validate(['file' => 'required|file|max:20480']);

        $exercise = $resource->exercise;
        if (!$exercise) {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        if ($exercise->template_file_path) {
            Storage::delete($exercise->template_file_path);
        }

        $file = $request->file('file');
        $path = $file->store('templates/' . $resource->course_id, 'public');

        $exercise->update([
            'template_file_path' => $path,
            'template_file_name' => $file->getClientOriginalName(),
        ]);

        return response()->json(['exercise' => $exercise->fresh()]);
    }

    // ── File submissions ──────────────────────────────────────────────────────

    public function getExercise(Resource $resource)
    {
        return response()->json(['exercise' => $resource->exercise]);
    }

    public function updateExercise(Request $request, Resource $resource)
    {
        $exercise = $resource->exercise;
        if (!$exercise) {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        $data = $request->validate([
            'instructions' => 'nullable|string|max:100000',
            'max_score'    => 'nullable|integer|min:1|max:100',
            'deadline'     => 'nullable|date',
        ]);

        $exercise->update(array_filter($data, fn($v) => $v !== null));

        return response()->json(['exercise' => $exercise->fresh()]);
    }

    public function enableSubmission(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'instructions' => 'nullable|string|max:2000',
            'max_score'    => 'nullable|integer|min:1|max:100',
            'deadline'     => 'nullable|date',
        ]);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $resource->title,
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'file_upload',
                'content'      => null,
                'max_score'    => $data['max_score'] ?? 20,
                'auto_correct' => false,
                'deadline'     => $data['deadline'] ?? null,
            ]
        );

        $resource->update(['file_type' => 'file_upload']);

        return response()->json(['exercise' => $exercise]);
    }

    public function resourceSubmissions(Resource $resource)
    {
        $exercise = $resource->exercise;
        if (!$exercise) {
            return response()->json(['submissions' => [], 'exercise' => null]);
        }

        $submissions = $exercise->submissions()->with('student')->latest()->get();
        return response()->json(['submissions' => $submissions, 'exercise' => $exercise]);
    }

    public function submissions(Exercise $exercise)
    {
        $submissions = $exercise->submissions()->with('student')->latest()->get();
        return response()->json(['submissions' => $submissions]);
    }

    public function correct(Request $request, ExerciseSubmission $submission)
    {
        $data = $request->validate([
            'score'           => 'required|numeric|min:0',
            'teacher_comment' => 'nullable|string',
        ]);

        $submission->update([
            'score'           => $data['score'],
            'teacher_comment' => $data['teacher_comment'] ?? null,
            'status'          => 'corrected',
            'corrected_at'    => now(),
        ]);

        return response()->json(['submission' => $submission->fresh()->load('student')]);
    }
}
