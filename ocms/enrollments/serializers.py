from rest_framework import serializers
from .models import Enrollment, LectureProgress
from courses.serializers import CourseSerializer
from courses.models import Lecture


class EnrollmentSerializer(serializers.ModelSerializer):
    course_detail = CourseSerializer(source="course", read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = ["student", "status", "enrolled_at"]


class LectureProgressSerializer(serializers.ModelSerializer):
    lecture_title = serializers.CharField(source="lecture.title", read_only=True)
    module_id = serializers.IntegerField(source="lecture.module_id", read_only=True)

    class Meta:
        model = LectureProgress
        fields = "__all__"
        read_only_fields = ["enrollment", "completed_at"]

