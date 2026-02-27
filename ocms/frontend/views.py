from django.shortcuts import render


def home(request):
    """Render the main OCMS frontend shell; all interaction is via JS + DRF APIs."""
    return render(request, "frontend/index.html")

