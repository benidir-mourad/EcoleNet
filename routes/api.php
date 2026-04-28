<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Teacher\ClassController;
use App\Http\Controllers\Api\Teacher\SectionController;
use App\Http\Controllers\Api\Teacher\CourseController;
use App\Http\Controllers\Api\Teacher\ResourceController;
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
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',           [AuthController::class, 'logout']);
    Route::get('/me',                [AuthController::class, 'me']);
    Route::put('/profile',           [AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar',   [AuthController::class, 'uploadAvatar']);

    // ── Teacher routes ────────────────────────────────────────────────────────
    Route::middleware('role:teacher,admin')->prefix('teacher')->group(function () {

        // Classes
        Route::apiResource('classes', ClassController::class);

        // Sections
        Route::apiResource('classes.sections', SectionController::class)->shallow();

        // Courses
        Route::apiResource('sections.courses', CourseController::class)->shallow();

        // Resources
        Route::apiResource('courses.resources', ResourceController::class)->shallow();
        Route::patch('resources/{resource}/visibility', [ResourceController::class, 'toggleVisibility']);
        Route::post('resources/{resource}/file',        [ResourceController::class, 'uploadFile']);

        // QCM builder
        Route::get('resources/{resource}/qcm',  [ExerciseController::class, 'getQcm']);
        Route::post('resources/{resource}/qcm', [ExerciseController::class, 'saveQcm']);

        // Drag & Drop builder
        Route::get('resources/{resource}/dragdrop',  [ExerciseController::class, 'getDragDrop']);
        Route::post('resources/{resource}/dragdrop', [ExerciseController::class, 'saveDragDrop']);

        // Enrollments
        Route::get('enrollments/pending',                    [EnrollmentController::class, 'pending']);
        Route::patch('enrollments/{enrollment}/approve',     [EnrollmentController::class, 'approve']);
        Route::patch('enrollments/{enrollment}/reject',      [EnrollmentController::class, 'reject']);
        Route::get('classes/{class}/students',               [EnrollmentController::class, 'classStudents']);

        // Exercise submissions
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

        // Stats
        Route::get('stats/overview',            [StatsController::class, 'overview']);
        Route::get('stats/courses',             [StatsController::class, 'allCourses']);
        Route::get('courses/{course}/stats',    [StatsController::class, 'course']);
    });

    // ── Student routes ────────────────────────────────────────────────────────
    Route::middleware('role:student')->prefix('student')->group(function () {

        // Dashboard & enrollment
        Route::get('dashboard',   [StudentDashboardController::class, 'index']);
        Route::get('classes',     [StudentCourseController::class, 'availableClasses']);
        Route::post('enroll',     [StudentDashboardController::class, 'enroll']);

        // Courses & resources
        Route::get('courses',             [StudentCourseController::class, 'index']);
        Route::get('courses/{course}',    [StudentCourseController::class, 'show']);
        Route::get('resources/{resource}',[StudentCourseController::class, 'resource']);
        Route::post('resources/{resource}/view', [ProgressController::class, 'markViewed']);

        // QCM
        Route::post('resources/{resource}/qcm/attempt', [QcmController::class, 'attempt']);
        Route::get('resources/{resource}/qcm/attempts', [QcmController::class, 'myAttempts']);
        Route::get('resources/{resource}/qcm',          [QcmController::class, 'getQcm']);

        // Drag & Drop
        Route::get('resources/{resource}/dragdrop',         [QcmController::class, 'getDragDrop']);
        Route::post('resources/{resource}/dragdrop/attempt',[ExerciseController::class, 'attemptDragDrop']);

        // Exercise submissions
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
    });

    // ── Admin routes ──────────────────────────────────────────────────────────
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('users',                   [AdminUserController::class, 'index']);
        Route::post('users',                  [AdminUserController::class, 'store']);
        Route::put('users/{user}',            [AdminUserController::class, 'update']);
        Route::delete('users/{user}',         [AdminUserController::class, 'destroy']);
        Route::patch('users/{user}/status',   [AdminUserController::class, 'updateStatus']);
    });
});
