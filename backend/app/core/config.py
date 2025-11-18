"""
Application configuration management using Pydantic settings.
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # Supabase Configuration
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_service_role_key: str = Field(..., description="Supabase service role key for admin operations")
    supabase_anon_key: str = Field(..., description="Supabase anonymous key")
    
    # SMTP Configuration
    smtp_host: str = Field(..., description="SMTP server host")
    smtp_port: int = Field(default=587, description="SMTP server port")
    smtp_user: str = Field(..., description="SMTP username")
    smtp_pass: str = Field(..., description="SMTP password")
    sender_email: str = Field(..., description="Sender email address")
    smtp_from: str = Field(..., description="Sender display name")
    
    # Application Configuration
    environment: str = Field(default="development", description="Environment (development, staging, production)")
    cors_origins: str = Field(default="http://localhost:3000", description="Comma-separated list of allowed CORS origins")
    api_prefix: str = Field(default="/api/v1", description="API route prefix")
    admin_password: str = Field(..., description="Admin password for API authentication")
    
    # Optional serverless configuration
    aws_region: str | None = Field(default=None, description="AWS region for serverless deployment")
    vercel_url: str | None = Field(default=None, description="Vercel deployment URL")
    
    @field_validator("smtp_port")
    @classmethod
    def validate_smtp_port(cls, v: int) -> int:
        """Validate SMTP port is in valid range."""
        if not (1 <= v <= 65535):
            raise ValueError("SMTP port must be between 1 and 65535")
        return v
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {', '.join(allowed)}")
        return v
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields in .env file (e.g., EXPO_PUBLIC_* variables)


# Global settings instance
settings = Settings()

