<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\ExerciseTemplate;
use App\Models\QcmOption;
use App\Models\QcmQuestion;
use App\Models\Resource;
use App\Models\StudentProgress;
use App\Services\NotificationService;
use App\Support\CodeExercisePresets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExerciseController extends Controller
{
    use AuthorizesCourseAccess;

    // ── QCM ──────────────────────────────────────────────────────────────────

    public function getQcm(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $questions = $resource->qcmQuestions()->with('options')->get();
        return response()->json(['questions' => $questions]);
    }

    public function saveQcm(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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

    public function getDragDrop(Request $request, Resource $resource)
    {
        $this->ensureCurrentUserCanAccessResource($request, $resource);

        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveDragDrop(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptDragDrop(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

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

        $this->markExerciseCompleted($request, $resource);

        return response()->json([
            'score'     => $score,
            'max_score' => $pairs->count(),
            'results'   => $results,
        ]);
    }

    // ── Fill Blanks ───────────────────────────────────────────────────────────

    public function getFillBlanks(Request $request, Resource $resource)
    {
        $this->ensureCurrentUserCanAccessResource($request, $resource);

        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveFillBlanks(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptFillBlanks(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

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

        $this->markExerciseCompleted($request, $resource);

        return response()->json([
            'score'     => $score,
            'max_score' => count($correctAnswers),
            'results'   => $results,
        ]);
    }

    // ── Ordering ──────────────────────────────────────────────────────────────

    public function getOrdering(Request $request, Resource $resource)
    {
        $this->ensureCurrentUserCanAccessResource($request, $resource);

        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveOrdering(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptOrdering(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

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

        $this->markExerciseCompleted($request, $resource);

        return response()->json([
            'score'     => $score,
            'max_score' => count($items),
            'results'   => $results,
        ]);
    }

    // ── Code Editor ───────────────────────────────────────────────────────────

    public function codeEditorPresets(Request $request)
    {
        return response()->json([
            'presets' => CodeExercisePresets::all(),
        ]);
    }

    public function codeEditorTemplates(Request $request)
    {
        $data = $request->validate([
            'language' => 'nullable|string|in:javascript,html,css,php,sql,python,text',
            'level' => 'nullable|string|in:beginner,intermediate,advanced',
        ]);

        $templates = ExerciseTemplate::query()
            ->where('teacher_id', $request->user()->id)
            ->where('type', 'code_editor')
            ->when($data['language'] ?? null, fn ($query, $language) => $query->where('language', $language))
            ->when($data['level'] ?? null, fn ($query, $level) => $query->where('level', $level))
            ->latest()
            ->get();

        return response()->json(['templates' => $templates]);
    }

    public function getCodeEditor(Request $request, Resource $resource)
    {
        $this->ensureCurrentUserCanAccessResource($request, $resource);

        return response()->json(['exercise' => $resource->exercise]);
    }

    public function storeCodeEditorTemplate(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $exercise = $resource->exercise;
        abort_if(!$exercise || $exercise->type !== 'code_editor', 404, 'Exercise not found.');

        $data = $request->validate([
            'title' => 'nullable|string|max:200',
            'summary' => 'nullable|string|max:500',
            'level' => 'nullable|string|in:beginner,intermediate,advanced',
        ]);

        $template = ExerciseTemplate::create([
            'teacher_id' => $request->user()->id,
            'title' => $data['title'] ?? $exercise->title,
            'type' => 'code_editor',
            'language' => $exercise->content['language'] ?? null,
            'level' => $data['level'] ?? 'beginner',
            'summary' => $data['summary'] ?? null,
            'instructions' => $exercise->instructions,
            'content' => $exercise->content,
            'max_score' => $exercise->max_score,
            'auto_correct' => $exercise->auto_correct,
        ]);

        return response()->json(['template' => $template], 201);
    }

    public function applyCodeEditorTemplate(Request $request, Resource $resource, ExerciseTemplate $template)
    {
        $this->ensureTeacherOwnsResource($request, $resource);
        abort_if($template->teacher_id !== $request->user()->id || $template->type !== 'code_editor', 403, 'Forbidden.');

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title' => $template->title,
                'instructions' => $template->instructions,
                'type' => 'code_editor',
                'content' => $template->content,
                'max_score' => $template->max_score,
                'auto_correct' => $template->auto_correct,
            ]
        );

        $resource->update(['file_type' => 'code_editor']);
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    public function destroyCodeEditorTemplate(Request $request, ExerciseTemplate $template)
    {
        abort_if($template->teacher_id !== $request->user()->id || $template->type !== 'code_editor', 403, 'Forbidden.');

        $template->delete();

        return response()->noContent();
    }

    public function saveCodeEditor(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $data = $request->validate([
            'title'           => 'required|string|max:200',
            'instructions'    => 'nullable|string|max:100000',
            'language'        => 'required|string|in:javascript,html,css,php,sql,python,text',
            'starter_code'    => 'nullable|string',
            'expected_output' => 'nullable|string',
            'auto_correct'    => 'boolean',
            'tests'           => 'nullable|array',
            'tests.*.label'   => 'required_with:tests|string|max:200',
            'tests.*.type'    => 'required_with:tests|string|in:contains,not_contains,regex,html_tag,html_attribute,css_selector,css_property,js_function,sql_clause,sql_table,sql_column,sql_where_condition,sql_order_by,sql_join',
            'tests.*.value'   => 'nullable|string|max:1000',
            'tests.*.pattern' => 'nullable|string|max:1000',
            'tests.*.attribute' => 'nullable|string|max:100',
            'tests.*.selector' => 'nullable|string|max:200',
            'tests.*.property' => 'nullable|string|max:100',
            'tests.*.expected' => 'nullable|string|max:500',
            'tests.*.points'  => 'nullable|integer|min:1|max:100',
            'tests.*.case_sensitive' => 'boolean',
            'tests.*.success_feedback' => 'nullable|string|max:500',
            'tests.*.failure_feedback' => 'nullable|string|max:500',
            'max_score'       => 'nullable|integer|min:1|max:100',
            'deadline'        => 'nullable|date',
        ]);

        $tests = collect($data['tests'] ?? [])
            ->filter(fn ($test) => !empty($test['label']) && (!empty($test['value']) || !empty($test['pattern']) || !empty($test['property'])))
            ->values()
            ->all();

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
                    'tests'           => $tests,
                ],
                'max_score'    => count($tests) > 0 ? collect($tests)->sum(fn ($test) => max((int) ($test['points'] ?? 1), 1)) : ($data['max_score'] ?? 20),
                'auto_correct' => (bool) ($data['auto_correct'] ?? false) && count($tests) > 0,
                'deadline'     => $data['deadline'] ?? null,
            ]
        );

        $resource->update(['file_type' => 'code_editor']);
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    // ── Truth Table ───────────────────────────────────────────────────────────

    public function getTruthTable(Request $request, Resource $resource)
    {
        $this->ensureCurrentUserCanAccessResource($request, $resource);

        return response()->json(['exercise' => $resource->exercise]);
    }

    public function saveTruthTable(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptTruthTable(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

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

        $this->markExerciseCompleted($request, $resource);

        return response()->json([
            'score'     => $score,
            'max_score' => $total,
            'results'   => $results,
        ]);
    }

    // ── Template file ─────────────────────────────────────────────────────────

    public function uploadTemplate(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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

    public function getExercise(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        return response()->json(['exercise' => $resource->exercise]);
    }

    public function updateExercise(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

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
        $this->ensureTeacherOwnsResource($request, $resource);

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
        $this->notifyNewExercise($resource, $exercise);

        return response()->json(['exercise' => $exercise]);
    }

    public function resourceSubmissions(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $exercise = $resource->exercise;
        if (!$exercise) {
            return response()->json(['submissions' => [], 'exercise' => null]);
        }

        $submissions = $exercise->submissions()->with('student')->latest()->get();
        return response()->json(['submissions' => $submissions, 'exercise' => $exercise]);
    }

    public function submissions(Request $request, Exercise $exercise)
    {
        $this->ensureTeacherOwnsExercise($request, $exercise);

        $submissions = $exercise->submissions()->with('student')->latest()->get();
        return response()->json(['submissions' => $submissions]);
    }

    public function correct(Request $request, ExerciseSubmission $submission)
    {
        $submission->loadMissing('exercise.resource.course');
        $this->ensureTeacherOwnsExercise($request, $submission->exercise);

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

        $notificationService = app(NotificationService::class);

        $notificationService->create(
            $submission->student,
            'submission_corrected',
            'Correction publiée',
            "La correction de {$submission->exercise->title} est disponible.",
            [
                'exercise_id' => $submission->exercise_id,
                'resource_id' => $submission->exercise->resource_id,
                'course_id'   => $submission->exercise->resource->course_id,
                'url'         => $notificationService->studentExerciseUrl($submission->exercise),
            ]
        );

        return response()->json(['submission' => $submission->fresh()->load('student')]);
    }

    private function notifyNewExercise(Resource $resource, Exercise $exercise): void
    {
        if (!$exercise->wasRecentlyCreated) {
            return;
        }

        app(NotificationService::class)->notifyNewExercise($resource, $exercise);
    }

    private function markExerciseCompleted(Request $request, Resource $resource): void
    {
        StudentProgress::updateOrCreate(
            ['student_id' => $request->user()->id, 'resource_id' => $resource->id],
            [
                'course_id' => $resource->course_id,
                'is_viewed' => true,
                'is_completed' => true,
                'viewed_at' => now(),
                'completed_at' => now(),
            ]
        );
    }
}
