from django.db import models
from datetime import datetime

class Schedule(models.Model):
    '''
    予定
    '''
    name       = models.CharField(max_length=128, null=False, blank=False, verbose_name="イベント名", help_text="イベント名")
    owner      = models.CharField(max_length=64 , null=True , blank=True , verbose_name="主催者"    , help_text="主催者")
    department = models.CharField(max_length=128, null=True , blank=True , verbose_name="所属"      , help_text="所属")
    url        = models.CharField(max_length=256, null=True , blank=True , verbose_name="URL"       , help_text="URL")

    create     = models.DateTimeField(default=datetime.now, verbose_name="作成日時", help_text="作成日時")
    update     = models.DateTimeField(default=datetime.now, verbose_name="更新日時", help_text="更新日時")

    comment    = models.TextField(default="", verbose_name="コメント", help_text="コメント")

    password   = models.CharField(max_length=50, null=True , blank=True , verbose_name="管理者Key" , help_text="管理者Key")
    is_enable  = models.BooleanField(default=True, verbose_name="有効/無効")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "予定"
        verbose_name_plural = verbose_name


class Participant(models.Model):
    '''
    参加者
    '''
    schedule   = models.ForeignKey(Schedule, null=False, blank=False, related_name="participants",
                                    verbose_name="予定", on_delete=models.CASCADE)

    name = models.CharField(max_length=64, null=False, blank=False, verbose_name="名前", help_text="名前")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "参加者"
        verbose_name_plural = verbose_name


class Candidate(models.Model):
    '''
    候補日程
    '''
    schedule   = models.ForeignKey(Schedule, null=False, blank=False, related_name="candidates",
                                    verbose_name="予定", on_delete=models.CASCADE)

    start_at   = models.DateTimeField(default=datetime.now, verbose_name="開始日時", help_text="開始日時")
    end_at     = models.DateTimeField(default=datetime.now, verbose_name="終了日時", help_text="終了日時")

    def __str__(self):
        return self.start_at + ',' + self.end_at

    class Meta:
        verbose_name = "候補日程"
        verbose_name_plural = verbose_name


class Attendance(models.Model):    
    '''
    出欠
    '''
    schedule     = models.ForeignKey(Schedule   , null=False, blank=False, related_name="attendances",
                                    verbose_name="予定", on_delete=models.CASCADE)

    participant  = models.ForeignKey(Participant, null=False, blank=False, related_name="attendances",
                                    verbose_name="参加者", on_delete=models.CASCADE)

    candidate    = models.ForeignKey(Candidate  , null=False, blank=False, related_name="attendances",
                                    verbose_name="候補日程", on_delete=models.CASCADE)

    attendance = models.CharField(max_length=7, choices=(("ok", "◯"), ("pending", "△"), ("ng", "×")),
                                 default="ok", verbose_name="出欠")

    comment    = models.TextField(default="", verbose_name="コメント", help_text="コメント")

    def __str__(self):
        return self.attendance

    class Meta:
        verbose_name = "出欠"
        verbose_name_plural = verbose_name
