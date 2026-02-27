# from django.db import models

# # Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):

    ROLE_CHOICES = (
        ('STUDENT', 'STUDENT'),
        ('INSTRUCTOR', 'INSTRUCTOR'),
        ('ADMIN', 'ADMIN'),
    )

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    is_active = models.BooleanField(default=True)
    # Defaults avoid interactive makemigrations prompts on existing rows.
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.username