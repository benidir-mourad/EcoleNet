<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // Get unique conversations
        $conversations = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->with('sender', 'receiver')
            ->latest()
            ->get()
            ->groupBy(fn($m) => $m->sender_id === $userId ? $m->receiver_id : $m->sender_id)
            ->map(fn($messages) => $messages->first());

        return response()->json(['conversations' => $conversations->values()]);
    }

    public function conversation(Request $request, User $user)
    {
        $myId = $request->user()->id;

        $messages = Message::where(function ($q) use ($myId, $user) {
            $q->where('sender_id', $myId)->where('receiver_id', $user->id);
        })->orWhere(function ($q) use ($myId, $user) {
            $q->where('sender_id', $user->id)->where('receiver_id', $myId);
        })->with('sender', 'receiver')->orderBy('created_at')->get();

        // Mark received messages as read
        Message::where('sender_id', $user->id)
            ->where('receiver_id', $myId)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['messages' => $messages]);
    }

    public function send(Request $request, User $user)
    {
        $data = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $message = Message::create([
            'sender_id'   => $request->user()->id,
            'receiver_id' => $user->id,
            'content'     => $data['content'],
        ]);

        app(NotificationService::class)->create(
            $user,
            'teacher_message',
            'Nouveau message',
            "{$request->user()->full_name} t'a envoyé un message.",
            ['message_id' => $message->id, 'sender_id' => $request->user()->id, 'url' => "/student/messages?message={$message->id}"]
        );

        return response()->json(['message' => $message->load('sender', 'receiver')], 201);
    }
}
