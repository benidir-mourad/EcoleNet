<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $student = $request->user();

        $messages = Message::where('sender_id', $student->id)
            ->orWhere('receiver_id', $student->id)
            ->with('sender', 'receiver')
            ->latest()
            ->get();

        return response()->json(['messages' => $messages]);
    }

    public function conversation(Request $request)
    {
        $student = $request->user();

        // Students message the teacher - find teacher
        $teacher = User::where('role', 'teacher')->first();

        if (!$teacher) {
            return response()->json(['messages' => []]);
        }

        $messages = Message::where(function ($q) use ($student, $teacher) {
            $q->where('sender_id', $student->id)->where('receiver_id', $teacher->id);
        })->orWhere(function ($q) use ($student, $teacher) {
            $q->where('sender_id', $teacher->id)->where('receiver_id', $student->id);
        })->with('sender', 'receiver')->orderBy('created_at')->get();

        Message::where('sender_id', $teacher->id)
            ->where('receiver_id', $student->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['messages' => $messages, 'teacher' => $teacher]);
    }

    public function send(Request $request)
    {
        $data = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $teacher = User::where('role', 'teacher')->first();

        if (!$teacher) {
            return response()->json(['message' => 'No teacher found.'], 422);
        }

        $message = Message::create([
            'sender_id'   => $request->user()->id,
            'receiver_id' => $teacher->id,
            'content'     => $data['content'],
        ]);

        app(NotificationService::class)->create(
            $teacher,
            'student_message',
            'Nouveau message élève',
            "{$request->user()->full_name} a envoyé un message.",
            ['message_id' => $message->id, 'url' => '/teacher/messages']
        );

        return response()->json(['message' => $message->load('sender', 'receiver')], 201);
    }
}
