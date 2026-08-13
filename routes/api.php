<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Teacher\ClassController;
use App\Http\Controllers\Api\Teacher\SectionController;
use App\Http\Controllers\Api\Teacher\CourseController;
use App\Http\Controllers\Api\Teacher\ChapterController;
use App\Http\Controllers\Api\Teacher\ResourceController;
use App\Http\Controllers\Api\Teacher\WebLessonController as TeacherWebLessonController;
use App\Http\Controllers\Api\Teacher\EnrollmentController;
use App\Http\Controllers\Api\Teacher\ExerciseController;
use App\Http\Controllers\Api\Teacher\MessageController as TeacherMessageController;
use App\Http\Controllers\Api\Teacher\ForumController as TeacherForumController;
use App\Http\Controllers\Api\Teacher\StatsController;
use App\Http\Controllers\Api\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\Student\CourseController as StudentCourseController;
use App\Http\Controllers\Api\Student\QcmController;
use App\Http\Controllers\Api\Student\SubmissionController;
use App\Http\Controllers\Api\Student\MessageController as StudentMessageController;
use App\Http\Controllers\Api\Student\ForumController as StudentForumController;
use App\Http\Controllers\Api\Student\ProgressController;
use App\Http\Controllers\Api\Student\WebLessonController as StudentWebLessonController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\Teacher\SyncController;
use App\Http\Controllers\Api\Teacher\GradeExportController;

// Public routes — limitées en débit : sans cela la force brute est libre, et
// /forgot-password permet d'inonder une boîte mail et d'épuiser le quota d'envoi.
Route::post('/register',        [AuthController::class, 'register'])->middleware('throttle:10,60');
Route::post('/login',           [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:3,10');
Route::post('/reset-password',  [PasswordResetController::class, 'reset'])->middleware('throttle:5,10');

// Fichiers pédagogiques — la signature de l'URL tient lieu d'autorisation, car
// une iframe ou une balise img ne peut pas porter d'en-tête Authorization.
// Les URL sont émises par l'API aux seuls utilisateurs déjà autorisés.
Route::middleware('signed')->group(function () {
    Route::get('/files/resources/{resource}',     [FileController::class, 'resource'])->name('files.resource');
    Route::get('/files/submissions/{submission}', [FileController::class, 'submission'])->name('files.submission');
    Route::get('/files/templates/{exercise}',     [FileController::class, 'template'])->name('files.template');
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',           [AuthController::class, 'logout']);
    Route::get('/me',                [AuthController::class, 'me']);
    Route::put('/profile',           [AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar',   [AuthController::class, 'uploadAvatar']);
    Route::get('/notifications',      [NotificationController::class, 'index']);
    Route::get('/notifications/preferences', [NotificationController::class, 'preferences']);
    Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/{notification}/unread', [NotificationController::class, 'markUnread']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    // ── Teacher routes ────────────────────────────────────────────────────────
    Route::middleware('role:teacher,admin')->prefix('teacher')->group(function () {

        // Classes
        Route::apiResource('classes', ClassController::class);

        // Sections
        Route::apiResource('classes.sections', SectionController::class)->shallow();

        // Courses
        Route::apiResource('sections.courses', CourseController::class)->shallow();

        // Library
        Route::get('library',                              [CourseController::class, 'library']);
        Route::post('courses/{course}/archive',             [CourseController::class, 'archive']);
        Route::post('courses/{course}/organize-chapters',   [CourseController::class, 'organizeRootResources']);
        Route::post('library/{course}/assign',              [CourseController::class, 'assignToSection']);
        Route::delete('library/{course}',                   [CourseController::class, 'destroyFromLibrary']);

        // Chapters
        Route::post('courses/{course}/chapters',    [ChapterController::class, 'store']);
        Route::put('chapters/{chapter}',            [ChapterController::class, 'update']);
        Route::delete('chapters/{chapter}',         [ChapterController::class, 'destroy']);

        // Resources
        Route::apiResource('courses.resources', ResourceController::class)->shallow();
        Route::post('chapters/{chapter}/resources', [ResourceController::class, 'storeForChapter']);
        Route::patch('resources/{resource}/visibility', [ResourceController::class, 'toggleVisibility']);
        Route::post('resources/{resource}/file',        [ResourceController::class, 'uploadFile']);
        Route::get('resources/{resource}/web-lesson',   [TeacherWebLessonController::class, 'show']);
        Route::post('resources/{resource}/web-lesson',  [TeacherWebLessonController::class, 'save']);

        // QCM builder
        Route::get('resources/{resource}/qcm',  [ExerciseController::class, 'getQcm']);
        Route::post('resources/{resource}/qcm', [ExerciseController::class, 'saveQcm']);

        // Drag & Drop builder
        Route::get('resources/{resource}/dragdrop',  [ExerciseController::class, 'getDragDrop']);
        Route::post('resources/{resource}/dragdrop', [ExerciseController::class, 'saveDragDrop']);

        // Fill Blanks builder
        Route::get('resources/{resource}/fill-blanks',  [ExerciseController::class, 'getFillBlanks']);
        Route::post('resources/{resource}/fill-blanks', [ExerciseController::class, 'saveFillBlanks']);

        // Ordering builder
        Route::get('resources/{resource}/ordering',  [ExerciseController::class, 'getOrdering']);
        Route::post('resources/{resource}/ordering', [ExerciseController::class, 'saveOrdering']);

        // Code Editor builder
        Route::get('code-editor-presets', [ExerciseController::class, 'codeEditorPresets']);
        Route::get('code-editor-templates', [ExerciseController::class, 'codeEditorTemplates']);
        Route::get('resources/{resource}/code-editor',  [ExerciseController::class, 'getCodeEditor']);
        Route::post('resources/{resource}/code-editor', [ExerciseController::class, 'saveCodeEditor']);
        Route::post('resources/{resource}/code-editor/templates', [ExerciseController::class, 'storeCodeEditorTemplate']);
        Route::post('resources/{resource}/code-editor/templates/{template}', [ExerciseController::class, 'applyCodeEditorTemplate']);
        Route::delete('code-editor-templates/{template}', [ExerciseController::class, 'destroyCodeEditorTemplate']);

        // Truth Table builder
        Route::get('resources/{resource}/truth-table',  [ExerciseController::class, 'getTruthTable']);
        Route::post('resources/{resource}/truth-table', [ExerciseController::class, 'saveTruthTable']);

        // Template file upload (for file_upload exercises)
        Route::post('resources/{resource}/template', [ExerciseController::class, 'uploadTemplate']);

        // Enrollments
        Route::get('enrollments/pending',                    [EnrollmentController::class, 'pending']);
        Route::patch('enrollments/{enrollment}/approve',     [EnrollmentController::class, 'approve']);
        Route::patch('enrollments/{enrollment}/reject',      [EnrollmentController::class, 'reject']);
        Route::patch('enrollments/{enrollment}/transfer',    [EnrollmentController::class, 'transfer']);
        Route::get('classes/{class}/students',               [EnrollmentController::class, 'classStudents']);

        // Export des notes — un classeur par classe, à reprendre pour les bulletins.
        Route::get('classes/{class}/grades.xlsx',            GradeExportController::class);

        // Exercise submissions
        Route::post('resources/{resource}/file_exercise',    [ExerciseController::class, 'enableSubmission']);
        Route::get('resources/{resource}/file_exercise',     [ExerciseController::class, 'getExercise']);
        Route::put('resources/{resource}/file_exercise',     [ExerciseController::class, 'updateExercise']);
        Route::get('resources/{resource}/submissions',       [ExerciseController::class, 'resourceSubmissions']);
        Route::get('exercises/{exercise}/submissions',       [ExerciseController::class, 'submissions']);
        Route::patch('submissions/{submission}/correct',     [ExerciseController::class, 'correct']);

        // Messaging
        Route::get('messages',         [TeacherMessageController::class, 'index']);
        Route::get('messages/{user}',  [TeacherMessageController::class, 'conversation']);
        Route::post('messages/{user}', [TeacherMessageController::class, 'send']);

        // Forum
        Route::get('courses/{course}/forum',  [TeacherForumController::class, 'index']);
        Route::post('courses/{course}/forum', [TeacherForumController::class, 'store']);
        Route::post('forum/{post}/reply',     [TeacherForumController::class, 'reply']);
        Route::delete('forum/{post}',         [TeacherForumController::class, 'destroy']);
        Route::patch('forum/{post}/pin',      [TeacherForumController::class, 'togglePin']);

        // Synchronisation OneDrive — la commande écrit sur le disque et en base,
        // on la réserve donc à l'administrateur du contenu.
        Route::get('sync/status',   [SyncController::class, 'status']);
        Route::post('sync/preview', [SyncController::class, 'preview'])->middleware('throttle:10,1');
        Route::post('sync/run',     [SyncController::class, 'run'])->middleware('throttle:3,5');

        // Stats
        Route::get('stats/overview',            [StatsController::class, 'overview']);
        Route::get('stats/courses',             [StatsController::class, 'allCourses']);
        Route::get('courses/{course}/stats',    [StatsController::class, 'course']);
        Route::get('courses/{course}/chapter-progress', [StatsController::class, 'chapterProgress']);
    });

    // ── Student routes ────────────────────────────────────────────────────────

    // Ouvertes aux comptes en attente : c'est le seul chemin pour demander son
    // inscription à une classe, et cette demande approuvée est ce qui active le compte.
    Route::middleware('role:student,allow-pending')->prefix('student')->group(function () {
        Route::get('dashboard',   [StudentDashboardController::class, 'index']);
        Route::get('classes',     [StudentCourseController::class, 'availableClasses']);
        Route::post('enroll',     [StudentDashboardController::class, 'enroll']);
    });

    Route::middleware('role:student')->prefix('student')->group(function () {

        // Courses & resources
        Route::get('courses',             [StudentCourseController::class, 'index']);
        Route::get('courses/{course}',    [StudentCourseController::class, 'show']);
        Route::get('resources/{resource}',[StudentCourseController::class, 'resource']);
        Route::post('resources/{resource}/view', [ProgressController::class, 'markViewed']);
        Route::get('resources/{resource}/web-lesson', [StudentWebLessonController::class, 'show']);

        // QCM
        Route::post('resources/{resource}/qcm/attempt', [QcmController::class, 'attempt']);
        Route::get('resources/{resource}/qcm/attempts', [QcmController::class, 'myAttempts']);
        Route::get('resources/{resource}/qcm',          [QcmController::class, 'getQcm']);

        // Drag & Drop
        Route::get('resources/{resource}/dragdrop',          [QcmController::class, 'getDragDrop']);
        Route::post('resources/{resource}/dragdrop/attempt', [ExerciseController::class, 'attemptDragDrop']);

        // Fill Blanks
        Route::get('resources/{resource}/fill-blanks',          [ExerciseController::class, 'getFillBlanks']);
        Route::post('resources/{resource}/fill-blanks/attempt', [ExerciseController::class, 'attemptFillBlanks']);

        // Ordering
        Route::get('resources/{resource}/ordering',          [ExerciseController::class, 'getOrdering']);
        Route::post('resources/{resource}/ordering/attempt', [ExerciseController::class, 'attemptOrdering']);

        // Code Editor (submit as text via existing submit route)
        Route::get('resources/{resource}/code-editor', [ExerciseController::class, 'getCodeEditor']);

        // Truth Table
        Route::get('resources/{resource}/truth-table',          [ExerciseController::class, 'getTruthTable']);
        Route::post('resources/{resource}/truth-table/attempt', [ExerciseController::class, 'attemptTruthTable']);

        // Exercise submissions
        Route::post('resources/{resource}/submit',        [SubmissionController::class, 'storeForResource']);
        Route::get('resources/{resource}/submission',     [SubmissionController::class, 'mySubmissionForResource']);
        Route::post('exercises/{exercise}/submit',        [SubmissionController::class, 'store']);
        Route::get('exercises/{exercise}/submission',     [SubmissionController::class, 'mySubmission']);

        // Progress
        Route::get('progress',                 [ProgressController::class, 'index']);
        Route::get('courses/{course}/progress',[ProgressController::class, 'course']);

        // Messaging
        Route::get('messages',              [StudentMessageController::class, 'index']);
        Route::post('messages',             [StudentMessageController::class, 'send']);
        Route::get('messages/conversation', [StudentMessageController::class, 'conversation']);

        // Forum
        Route::get('courses/{course}/forum',  [StudentForumController::class, 'index']);
        Route::post('courses/{course}/forum', [StudentForumController::class, 'store']);
        Route::post('forum/{post}/reply',     [StudentForumController::class, 'reply']);
        Route::delete('forum/{post}',         [StudentForumController::class, 'destroy']);
    });

    // ── Admin routes ──────────────────────────────────────────────────────────
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('users',                   [AdminUserController::class, 'index']);
        Route::post('users',                  [AdminUserController::class, 'store']);
        Route::put('users/{user}',            [AdminUserController::class, 'update']);
        Route::delete('users/{user}',         [AdminUserController::class, 'destroy']);
        Route::patch('users/{user}/status',   [AdminUserController::class, 'updateStatus']);

        // Journal d'audit — lecture seule, aucune route n'écrit ni ne supprime.
        Route::get('activity-log',         [ActivityLogController::class, 'index']);
        Route::get('activity-log/actions', [ActivityLogController::class, 'actions']);
    });
});
