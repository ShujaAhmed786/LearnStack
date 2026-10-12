import { apiFetch } from './api';

export function trackEvent(
  eventType:
    | 'lesson_started'
    | 'lesson_completed'
    | 'quiz_started'
    | 'quiz_completed'
    | 'video_played'
    | 'login'
    | string,
  params?: {
    lessonId?: string;
    courseId?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    apiFetch('/v1/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        eventType,
        lessonId: params?.lessonId,
        courseId: params?.courseId,
        metadata: params?.metadata,
      }),
    }).catch(() => {
      // Fire-and-forget: do not interrupt user actions on network/tracking errors
    });
  } catch {
    // Suppress any tracking exceptions
  }
}
