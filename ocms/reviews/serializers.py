from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)

    class Meta:
        model = Review
        fields = "__all__"
        read_only_fields = ["student", "created_at"]

