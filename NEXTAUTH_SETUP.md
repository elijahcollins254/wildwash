# NextAuth.js + Django Google OAuth Integration Setup

## Frontend Setup Complete ✓

NextAuth.js has been set up on the frontend. Now you need to configure Django to handle Google OAuth.

## Django Backend Setup Required

### 1. Install Google Auth Packages

```bash
# In your Django environment
pip install google-auth google-auth-oauthlib
```

### 2. Create Google OAuth Endpoint

Add this endpoint to your Django API (`wild-wash-api/users/views.py` or a new OAuth views file):

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from google.auth.transport import requests
from google.oauth2 import id_token

User = get_user_model()

@api_view(['POST'])
def google_auth(request):
    """
    Authenticates user via Google OAuth
    Expects: {
        "email": "user@gmail.com",
        "name": "User Name",
        "google_id": "google_unique_id"
    }
    """
    email = request.data.get('email')
    name = request.data.get('name')
    google_id = request.data.get('google_id')
    
    if not email or not google_id:
        return Response({
            'error': 'Email and google_id are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0] + '_' + google_id[:8],
                'first_name': name.split()[0] if name else '',
                'last_name': ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else '',
            }
        )
        
        # Create or get token
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': getattr(user, 'phone', ''),
                'role': getattr(user, 'role', 'user'),
                'staff_type': getattr(user, 'staff_type', None),
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### 3. Add URL Route

Add to your `urls.py`:

```python
from django.urls import path
from .views import google_auth

urlpatterns = [
    # ... existing paths ...
    path('users/google-auth/', google_auth, name='google-auth'),
]
```

### 4. Environment Variables

No additional env variables needed on Django for basic OAuth. But if you want to verify tokens server-side:

```python
# settings.py
GOOGLE_OAUTH_CLIENT_ID = 'your_google_client_id'  # Optional for verification
```

## Frontend Configuration

Create a `.env.local` file in the Next.js project root:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# API Base
NEXT_PUBLIC_API_BASE=http://localhost:8000/api
```

### Generate NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

## How It Works

1. **Frontend**: User clicks "Sign in with Google"
2. **NextAuth**: Handles OAuth flow with Google
3. **Frontend→Backend**: Sends user email, name, and google_id to Django
4. **Django**: Creates or fetches user, returns auth token
5. **NextAuth**: Stores token in JWT session
6. **Frontend**: Redirects based on user role

## Testing

1. Start Django: `python manage.py runserver`
2. Start Next.js: `npm run dev`
3. Navigate to login page
4. Click "Continue with Google"
5. Complete Google OAuth flow
6. Should redirect to home page (or role-based page)

## Troubleshooting

**"Google OAuth backend error"**
- Check Django server is running
- Verify `NEXT_PUBLIC_API_BASE` URL
- Check Django endpoint returns proper JSON

**"Session not persisting"**
- Verify `NEXTAUTH_SECRET` is set
- Check browser cookies are enabled
- Verify JWT callbacks are working

**"User created but role is wrong"**
- Check if Django User model has role field
- Update the response in `google_auth` endpoint to include role logic

## Next Steps

1. Test the flow locally
2. Update user profile selection (location, preferences) after Google auth
3. Consider adding phone number requirement for additional validation
4. Add opt-in for SMS/WhatsApp notifications after signup
