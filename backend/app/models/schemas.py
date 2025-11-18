"""
Pydantic models for request/response validation.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


# Invite Code Models
class InviteCodeBase(BaseModel):
    """Base invite code model."""
    code: str
    max_uses: int = Field(default=1, ge=1)
    expires_in_days: Optional[int] = Field(default=30, ge=1, le=365)


class InviteCodeResponse(BaseModel):
    """Invite code response model."""
    id: str
    code: str
    is_used: bool
    used_by: Optional[str] = None
    used_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    max_uses: int
    current_uses: int
    email_sent_to: List[str]
    reminder_sent_at: Optional[datetime] = None
    is_archived: bool


class GenerateInviteCodeRequest(BaseModel):
    """Request to generate invite code."""
    max_uses: int = Field(default=1, ge=1)
    expires_in_days: int = Field(default=30, ge=1, le=365)


class BulkDeleteInviteCodesRequest(BaseModel):
    """Request to bulk delete invite codes."""
    code_ids: List[str] = Field(..., min_length=1)


class ArchiveInviteCodeRequest(BaseModel):
    """Request to archive invite code."""
    code_id: str


class UnarchiveInviteCodeRequest(BaseModel):
    """Request to unarchive invite code."""
    code_id: str


# User Models
class UserProfileResponse(BaseModel):
    """User profile response model."""
    id: str
    user_id: str
    full_name: str
    preferred_name: str
    work_description: str
    personal_references: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    avatar_url: Optional[str] = None
    referral_source: Optional[str] = None
    consent_given: Optional[bool] = None
    consent_date: Optional[datetime] = None
    email: str
    metadata: Optional[Dict[str, Any]] = None
    plan_type: str
    account_type: str


class CreateUserRequest(BaseModel):
    """Request to create user."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    preferred_name: Optional[str] = None
    work_description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DeleteUserRequest(BaseModel):
    """Request to delete user."""
    user_id: str


class BulkDeleteUsersRequest(BaseModel):
    """Request to bulk delete users."""
    user_ids: List[str] = Field(..., min_length=1)


# Waitlist Models
class WaitlistUserResponse(BaseModel):
    """Waitlist user response model."""
    id: str
    full_name: str
    email: str
    company: Optional[str] = None
    phone_number: str
    country_code: str
    reference: Optional[str] = None
    referral_source: Optional[str] = None
    referral_source_other: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    joined_at: datetime
    notified_at: Optional[datetime] = None
    is_notified: bool
    is_archived: bool


class ArchiveWaitlistUsersRequest(BaseModel):
    """Request to archive waitlist users."""
    user_ids: Optional[List[str]] = None  # If None, archive all notified users


# Email Models
class EmailContent(BaseModel):
    """Email content model."""
    subject: str
    text_content: str
    html_content: str


class SendBulkEmailRequest(BaseModel):
    """Request to send bulk email."""
    custom_email: Optional[EmailContent] = None
    selected_user_ids: Optional[List[str]] = None


class SendIndividualEmailRequest(BaseModel):
    """Request to send individual email."""
    individual_email: EmailStr
    subject: str
    text_content: str
    html_content: str


class SendReminderEmailRequest(BaseModel):
    """Request to send reminder email."""
    code_id: str
    recipient_email: EmailStr
    recipient_name: str


# Credit Models
class CreditBalanceResponse(BaseModel):
    """Credit balance response model."""
    user_id: str
    balance_dollars: float
    total_purchased: float
    total_used: float
    last_updated: datetime
    metadata: Dict[str, Any]
    user_email: Optional[str] = None
    user_name: Optional[str] = None


class AssignCreditsRequest(BaseModel):
    """Request to assign credits to user."""
    user_id: str
    credits_to_add: float = Field(..., gt=0)
    notes: Optional[str] = None


class CreditPurchaseResponse(BaseModel):
    """Credit purchase response model."""
    id: str
    user_id: str
    amount_dollars: float
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    status: str
    description: Optional[str] = None
    metadata: Dict[str, Any]
    created_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None


class CreditBalanceQueryParams(BaseModel):
    """Query parameters for credit balance."""
    user_id: Optional[str] = None


# Usage Logs Models
class UsageLogsAggregatedRequest(BaseModel):
    """Request for aggregated usage logs."""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    search_query: str = Field(default="")
    activity_filter: str = Field(default="all")  # all, high, medium, low, inactive
    user_type_filter: str = Field(default="external")  # internal, external
    
    @field_validator("activity_filter")
    @classmethod
    def validate_activity_filter(cls, v: str) -> str:
        """Validate activity filter value."""
        allowed = ["all", "high", "medium", "low", "inactive"]
        if v not in allowed:
            raise ValueError(f"Activity filter must be one of: {', '.join(allowed)}")
        return v
    
    @field_validator("user_type_filter")
    @classmethod
    def validate_user_type_filter(cls, v: str) -> str:
        """Validate user type filter value."""
        allowed = ["internal", "external"]
        if v not in allowed:
            raise ValueError(f"User type filter must be one of: {', '.join(allowed)}")
        return v


class UsageLogResponse(BaseModel):
    """Usage log response model."""
    user_id: str
    user_name: str
    user_email: str
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_estimated_cost: float
    usage_count: int
    earliest_activity: datetime
    latest_activity: datetime
    has_completed_payment: bool
    activity_level: str
    days_since_last_activity: int
    activity_score: float
    user_type: str


class UsageLogsAggregatedResponse(BaseModel):
    """Aggregated usage logs response."""
    success: bool
    data: List[UsageLogResponse]
    total_count: int
    grand_total_tokens: int
    grand_total_cost: float
    page: int
    limit: int


# Dashboard Models
class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response."""
    total_codes: int
    usage_rate: float
    active_codes: int
    emails_sent: int


# Generic Response Models
class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Generic error response."""
    success: bool = False
    message: str
    error: Optional[str] = None

