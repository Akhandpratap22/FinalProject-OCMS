from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone

from .models import Enrollment, LectureProgress
from .serializers import EnrollmentSerializer, LectureProgressSerializer
from courses.models import Course


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_in_course(request, course_id):
    """Enroll the authenticated student in a course."""
    if request.user.role != "STUDENT":
        return Response({"error": "Only students can enroll in courses"}, status=status.HTTP_403_FORBIDDEN)

    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

    enrollment, created = Enrollment.objects.get_or_create(
        student=request.user,
        course=course,
    )

    serializer = EnrollmentSerializer(enrollment)
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_enrollments(request):
    """List courses the authenticated student is enrolled in."""
    if request.user.role != "STUDENT":
        return Response({"error": "Only students can view their enrollments"}, status=status.HTTP_403_FORBIDDEN)

    enrollments = Enrollment.objects.filter(student=request.user).select_related('course')
    serializer = EnrollmentSerializer(enrollments, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_lecture_completed(request, enrollment_id, lecture_id):
    if request.user.role != "STUDENT":
        return Response({"error": "Only students can update progress"}, status=status.HTTP_403_FORBIDDEN)

    try:
        enrollment = Enrollment.objects.get(pk=enrollment_id, student=request.user)
    except Enrollment.DoesNotExist:
        return Response({"error": "Enrollment not found"}, status=status.HTTP_404_NOT_FOUND)

    progress, _ = LectureProgress.objects.get_or_create(enrollment=enrollment, lecture_id=lecture_id)
    progress.completed = True
    progress.completed_at = timezone.now()
    progress.save()
    return Response(LectureProgressSerializer(progress).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enrollment_progress(request, enrollment_id):
    if request.user.role != "STUDENT":
        return Response({"error": "Only students can view progress"}, status=status.HTTP_403_FORBIDDEN)

    try:
        enrollment = Enrollment.objects.get(pk=enrollment_id, student=request.user)
    except Enrollment.DoesNotExist:
        return Response({"error": "Enrollment not found"}, status=status.HTTP_404_NOT_FOUND)

    progress = LectureProgress.objects.filter(enrollment=enrollment).select_related("lecture")
    return Response(LectureProgressSerializer(progress, many=True).data)
