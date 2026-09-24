"""
1-on-1 notification e-mails (RFC-0005 v2)

All tasks are dispatched with schedule.async_tasks.enqueue, so they run
synchronously when no Celery broker is configured.
"""

import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

SIGNATURE = '\n---\n日程調整ツール'


def _frontend(path: str) -> str:
    return f"{settings.FRONTEND_URL}{path}"


def _format_slot(slot, tz_name: str) -> str:
    try:
        tz = ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, ValueError):
        tz = ZoneInfo(settings.TIME_ZONE)
    start = timezone.localtime(slot.start_at, tz)
    end = timezone.localtime(slot.end_at, tz)
    return f"{start:%Y/%m/%d %H:%M} - {end:%H:%M} ({tz_name})"


def _send(subject: str, body: str, to: str) -> None:
    if not to:
        return
    try:
        send_mail(subject, body + SIGNATURE, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
    except Exception as exc:
        logger.error('Failed to send e-mail "%s": %s', subject, exc.__class__.__name__)


@shared_task
def send_page_verification_email(page_id: int, verify_token: str, host_token: str) -> None:
    """匿名で作成された予約ページの主催者に、認証リンクと管理リンクを送る"""
    from .models import AvailabilityPage

    page = AvailabilityPage.objects.filter(pk=page_id).first()
    if page is None:
        return
    verify_url = _frontend(f"/booking/verify?slug={page.slug}&token={verify_token}")
    host_url = _frontend(f"/booking/{page.slug}/host?token={host_token}")
    body = (
        f"{page.organizer_name} 様\n\n"
        f"予約ページ「{page.title}」を作成しました。\n\n"
        f"▼ 1. メールアドレスを確認してページを公開する\n{verify_url}\n\n"
        f"▼ 2. 管理ページ（空き枠の追加・予約の確認）\n{host_url}\n\n"
        "管理ページのURLは再発行できません。このメールを保管してください。\n"
    )
    _send(f"【予約ページ】メールアドレスの確認 - {page.title}", body, page.organizer_email)


@shared_task
def send_booking_notifications(booking_id: int, cancel_token: str) -> None:
    """予約成立時: 主催者へ通知、ゲストへ確認メール（キャンセルリンク付き）"""
    from .models import Booking

    booking = Booking.objects.select_related('slot__page__owner').filter(pk=booking_id).first()
    if booking is None:
        return
    page = booking.slot.page
    when = _format_slot(booking.slot, page.timezone_name)

    if page.notify_on_booking:
        _send(
            f"【予約】{booking.guest_name}さんが予約しました - {page.title}",
            f"{page.organizer_display_name} 様\n\n「{page.title}」に予約が入りました。\n\n"
            f"日時: {when}\nお名前: {booking.guest_name}\nメール: {booking.guest_email}\n"
            f"メッセージ: {booking.guest_message or 'なし'}\n",
            page.notification_email,
        )

    cancel_url = _frontend(f"/booking/cancel?booking={booking.uuid}&token={cancel_token}")
    _send(
        f"【予約確認】{page.title}",
        f"{booking.guest_name} 様\n\n以下の内容で予約を受け付けました。\n\n"
        f"予約: {page.title}\n主催者: {page.organizer_display_name}\n日時: {when}\n\n"
        f"▼ 予約内容の確認・キャンセル\n{cancel_url}\n",
        booking.guest_email,
    )


@shared_task
def send_cancellation_notification(booking_id: int, cancelled_by: str) -> None:
    """キャンセル時: キャンセルしなかった側へ通知する"""
    from .models import Booking

    booking = Booking.objects.select_related('slot__page__owner').filter(pk=booking_id).first()
    if booking is None:
        return
    page = booking.slot.page
    when = _format_slot(booking.slot, page.timezone_name)

    if cancelled_by == 'guest':
        _send(
            f"【キャンセル】{booking.guest_name}さんが予約をキャンセルしました - {page.title}",
            f"{page.organizer_display_name} 様\n\n以下の予約がキャンセルされました。\n\n"
            f"日時: {when}\nお名前: {booking.guest_name}\n\nこの枠は再び予約可能になりました。\n",
            page.notification_email,
        )
    else:
        _send(
            f"【キャンセル】予約がキャンセルされました - {page.title}",
            f"{booking.guest_name} 様\n\n主催者により以下の予約がキャンセルされました。\n\n"
            f"予約: {page.title}\n日時: {when}\n",
            booking.guest_email,
        )
