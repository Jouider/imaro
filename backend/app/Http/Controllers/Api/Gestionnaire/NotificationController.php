<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (Notification $n) => [
                'id'      => $n->id,
                'type'    => $n->type,
                'title'   => $n->title,
                'message' => $n->message,
                'time'    => $n->created_at->toIso8601String(),
                'read'    => $n->read,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['notifications' => $notifications],
        ]);
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        $notification->update(['read' => true]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Notification lue.',
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('read', false)
            ->update(['read' => true]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Toutes les notifications marquées comme lues.',
        ]);
    }

    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        $notification->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Notification supprimée.',
        ]);
    }
}
