"""
Microsoft Graph API Client
RFC-0002: Outlookカレンダー連携

Provides OAuth flow and Outlook Calendar API operations via Microsoft Graph.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# Microsoft OAuth2 endpoints
MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
MS_GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

# Scopes needed for calendar operations
MS_SCOPES = [
    'User.Read',
    'Calendars.ReadWrite',
    'OnlineMeetings.ReadWrite',
]


class OutlookCalendarError(Exception):
    """Microsoft Graph API error"""
    pass


class OutlookCalendarClient:
    """
    Microsoft Graph API クライアント
    
    OAuth認証とOutlookカレンダー操作を提供
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Microsoft Graph API"""
        url = f'{MS_GRAPH_BASE}{endpoint}'
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json() if response.content else {}
        except requests.exceptions.HTTPError as e:
            logger.error(f'Microsoft Graph API error: {e.response.status_code} - {e.response.text}')
            raise OutlookCalendarError(f'API error: {e.response.status_code}')
        except requests.exceptions.RequestException as e:
            logger.error(f'Microsoft Graph request failed: {e}')
            raise OutlookCalendarError(f'Request failed: {e}')
    
    def get_calendars(self) -> List[Dict[str, Any]]:
        """Get list of user's calendars"""
        result = self._request('GET', '/me/calendars')
        return result.get('value', [])
    
    def get_calendar_view(
        self,
        start: datetime,
        end: datetime,
        calendar_id: str = 'primary'
    ) -> List[Dict[str, Any]]:
        """
        Get events in a time range
        
        Args:
            start: Start of time range
            end: End of time range
            calendar_id: Calendar ID (default: primary)
            
        Returns:
            List of events
        """
        endpoint = '/me/calendar/calendarView' if calendar_id == 'primary' else f'/me/calendars/{calendar_id}/calendarView'
        
        params = {
            'startDateTime': start.isoformat(),
            'endDateTime': end.isoformat(),
            '$select': 'subject,start,end,isAllDay,isCancelled',
            '$orderby': 'start/dateTime',
        }
        
        result = self._request('GET', endpoint, params=params)
        return result.get('value', [])
    
    def create_event(
        self,
        subject: str,
        start: datetime,
        end: datetime,
        body: str = '',
        attendees: Optional[List[str]] = None,
        calendar_id: str = 'primary',
        add_teams_meeting: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a calendar event
        
        Args:
            subject: Event title
            start: Start datetime
            end: End datetime
            body: Event body/description
            attendees: List of attendee email addresses
            calendar_id: Calendar ID (default: primary)
            add_teams_meeting: Whether to add Teams meeting link
            
        Returns:
            Created event data including onlineMeeting info
        """
        event = {
            'subject': subject,
            'body': {
                'contentType': 'text',
                'content': body,
            },
            'start': {
                'dateTime': start.strftime('%Y-%m-%dT%H:%M:%S'),
                'timeZone': 'Asia/Tokyo',
            },
            'end': {
                'dateTime': end.strftime('%Y-%m-%dT%H:%M:%S'),
                'timeZone': 'Asia/Tokyo',
            },
        }
        
        if attendees:
            event['attendees'] = [
                {
                    'emailAddress': {'address': email},
                    'type': 'required',
                }
                for email in attendees
            ]
        
        if add_teams_meeting:
            event['isOnlineMeeting'] = True
            event['onlineMeetingProvider'] = 'teamsForBusiness'
        
        endpoint = '/me/calendar/events' if calendar_id == 'primary' else f'/me/calendars/{calendar_id}/events'
        
        result = self._request('POST', endpoint, json=event)
        
        logger.info(f'Created Outlook event: {result.get("id")}')
        return result
    
    def get_event(self, event_id: str) -> Dict[str, Any]:
        """Get a specific event"""
        return self._request('GET', f'/me/events/{event_id}')
    
    def delete_event(self, event_id: str) -> None:
        """Delete an event"""
        self._request('DELETE', f'/me/events/{event_id}')
        logger.info(f'Deleted Outlook event: {event_id}')
    
    def create_online_meeting(
        self,
        subject: str,
        start: datetime,
        end: datetime,
    ) -> Dict[str, Any]:
        """
        Create a Teams online meeting
        
        Args:
            subject: Meeting subject
            start: Start datetime
            end: End datetime
            
        Returns:
            Meeting data including joinUrl
        """
        meeting = {
            'subject': subject,
            'startDateTime': start.isoformat(),
            'endDateTime': end.isoformat(),
        }
        
        result = self._request('POST', '/me/onlineMeetings', json=meeting)
        
        logger.info(f'Created Teams meeting: {result.get("id")}')
        return result


def get_oauth_url(state: str) -> str:
    """
    Generate Microsoft OAuth authorization URL
    
    Args:
        state: State parameter for CSRF protection
        
    Returns:
        Authorization URL to redirect user to
    """
    params = {
        'client_id': settings.MICROSOFT_CLIENT_ID,
        'redirect_uri': settings.MICROSOFT_REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(MS_SCOPES),
        'response_mode': 'query',
        'state': state,
    }
    return f'{MS_AUTH_URL}?{urlencode(params)}'


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """
    Exchange authorization code for access and refresh tokens
    
    Args:
        code: Authorization code from OAuth callback
        
    Returns:
        Token response containing access_token, refresh_token, expires_in
    """
    data = {
        'client_id': settings.MICROSOFT_CLIENT_ID,
        'client_secret': settings.MICROSOFT_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': settings.MICROSOFT_REDIRECT_URI,
        'scope': ' '.join(MS_SCOPES),
    }
    
    response = requests.post(MS_TOKEN_URL, data=data)
    
    if not response.ok:
        logger.error(f'Token exchange failed: {response.status_code} - {response.text}')
        raise OutlookCalendarError(f'Token exchange failed: {response.status_code}')
    
    return response.json()


def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """
    Refresh an access token using refresh token
    
    Args:
        refresh_token: Refresh token from initial OAuth
        
    Returns:
        New token response containing access_token, expires_in
    """
    data = {
        'client_id': settings.MICROSOFT_CLIENT_ID,
        'client_secret': settings.MICROSOFT_CLIENT_SECRET,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token',
        'scope': ' '.join(MS_SCOPES),
    }
    
    response = requests.post(MS_TOKEN_URL, data=data)
    
    if not response.ok:
        logger.error(f'Token refresh failed: {response.status_code} - {response.text}')
        raise OutlookCalendarError(f'Token refresh failed: {response.status_code}')
    
    return response.json()
