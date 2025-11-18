"""
Usage logs API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import (
    UsageLogsAggregatedRequest,
    UsageLogsAggregatedResponse,
)
from app.core.database import get_supabase_admin
from app.core.auth import verify_admin_password
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usage-logs", tags=["usage-logs"])


@router.post("/aggregated", response_model=UsageLogsAggregatedResponse)
async def get_aggregated_usage_logs(
    request: UsageLogsAggregatedRequest,
    _: None = Depends(verify_admin_password),
):
    """Get aggregated usage logs using RPC function."""
    try:
        supabase = get_supabase_admin()
        
        # Call Supabase RPC function
        response = supabase.rpc(
            "get_aggregated_usage_logs",
            {
                "search_query": request.search_query or "",
                "activity_level_filter": "" if request.activity_filter == "all" else request.activity_filter,
                "page_number": request.page,
                "page_size": request.limit,
                "user_type_filter": request.user_type_filter,
            }
        ).execute()
        
        if response.data is None:
            return UsageLogsAggregatedResponse(
                success=True,
                data=[],
                total_count=0,
                grand_total_tokens=0,
                grand_total_cost=0.0,
                page=request.page,
                limit=request.limit,
            )
        
        # Extract metadata from first row
        total_count = response.data[0].get("total_count", 0) if response.data else 0
        grand_total_tokens = response.data[0].get("grand_total_tokens", 0) if response.data else 0
        grand_total_cost = float(response.data[0].get("grand_total_cost", 0)) if response.data else 0.0
        
        # Transform data
        from app.models.schemas import UsageLogResponse
        from datetime import datetime
        
        logs = []
        for row in response.data:
            logs.append(UsageLogResponse(
                user_id=row["user_id"],
                user_name=row.get("user_name", ""),
                user_email=row.get("user_email", ""),
                total_prompt_tokens=row.get("total_prompt_tokens", 0),
                total_completion_tokens=row.get("total_completion_tokens", 0),
                total_tokens=row.get("total_tokens", 0),
                total_estimated_cost=float(row.get("total_estimated_cost", 0)),
                usage_count=row.get("usage_count", 0),
                earliest_activity=datetime.fromisoformat(row["earliest_activity"]) if row.get("earliest_activity") else datetime.now(),
                latest_activity=datetime.fromisoformat(row["latest_activity"]) if row.get("latest_activity") else datetime.now(),
                has_completed_payment=row.get("has_completed_payment", False),
                activity_level=row.get("activity_level", "inactive"),
                days_since_last_activity=row.get("days_since_last_activity", 0),
                activity_score=float(row.get("activity_score", 0)),
                user_type=row.get("user_type", "external"),
            ))
        
        return UsageLogsAggregatedResponse(
            success=True,
            data=logs,
            total_count=int(total_count),
            grand_total_tokens=int(grand_total_tokens),
            grand_total_cost=grand_total_cost,
            page=request.page,
            limit=request.limit,
        )
    except Exception as e:
        logger.error(f"Error fetching aggregated usage logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage logs",
        )

