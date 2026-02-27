# from django.shortcuts import render

# # Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from django.db.models import Count
from accounts.models import User
from courses.models import Course
from enrollments.models import Enrollment

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics(request):

    if request.user.role != "ADMIN":
        return Response({"error": "Only admin allowed"}, status=403)

    data = {
        "total_users": User.objects.count(),
        "total_courses": Course.objects.count(),
        "total_enrollments": Enrollment.objects.count(),
    }

    return Response(data)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_courses(request):

    cache_key = "top_courses"
    data = cache.get(cache_key)

    if not data:
        courses = (
            Course.objects.annotate(enrollment_count=Count('enrollments'))
            .order_by('-enrollment_count')[:5]
        )
        data = [{"title": c.title, "enrollment_count": c.enrollment_count} for c in courses]
        cache.set(cache_key, data, timeout=300)

    return Response(data)