# from django.db import models

# # Create your models here.
from django.db import models
from django.conf import settings
from django.utils import timezone
from courses.models import Course, Lecture


class Enrollment(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'ACTIVE'),
        ('COMPLETED', 'COMPLETED'),
    )

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    enrolled_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="unique_enrollment_per_student_course"),
        ]
        ordering = ["-enrolled_at", "id"]

    def __str__(self):
        return f"{self.student} -> {self.course}"


class LectureProgress(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="lecture_progress")
    lecture = models.ForeignKey(Lecture, on_delete=models.CASCADE, related_name="progress_entries")
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["enrollment", "lecture"], name="unique_progress_per_enrollment_lecture"),
        ]