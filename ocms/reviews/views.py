from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Review
from .serializers import ReviewSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def course_reviews(request, course_id):
    reviews = Review.objects.filter(course_id=course_id).select_related("student").order_by("-created_at")
    return Response(ReviewSerializer(reviews, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_review(request, course_id):
    if request.user.role != "STUDENT":
        return Response({"error": "Only students can review courses"}, status=status.HTTP_403_FORBIDDEN)

    serializer = ReviewSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(student=request.user, course_id=course_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

