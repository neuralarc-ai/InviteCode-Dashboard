"""
Application configuration management using Pydantic settings.
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import os


class Settings(BaseSettings):
    """Application settings with validation."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Explicitly read from environment variables (for Vercel/serverless)
        env_ignore_empty=True,
        extra="ignore",
    )
    
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


# Global settings instance
# Load settings with explicit environment variable reading for Vercel
def load_settings() -> Settings:
    """Load settings with explicit environment variable handling for serverless."""
    try:
        # First try standard Pydantic Settings loading
        return Settings()
    except Exception as e:
        # If that fails, try to load from os.environ explicitly
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Standard settings load failed: {e}, trying explicit env var loading")
        
        # Check what env vars are actually available
        env_keys = list(os.environ.keys())
        relevant_keys = [k for k in env_keys if any(
            key in k.upper() for key in ['SUPABASE', 'SMTP', 'ENVIRONMENT', 'CORS', 'API_PREFIX']
        )]
        logger.info(f"Found {len(relevant_keys)} relevant environment variables: {relevant_keys}")
        
        # Try to construct settings dict from environment
        settings_dict = {}
        required_vars = [
            'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
            'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS',
            'SENDER_EMAIL', 'SMTP_FROM'
        ]
        
        missing_vars = []
        for var in required_vars:
            # Try different case variations
            value = os.environ.get(var) or os.environ.get(var.lower()) or os.environ.get(var.upper())
            if value:
                # Convert to snake_case for Pydantic
                key = var.lower()
                # Handle integer conversion for SMTP_PORT
                if key == 'smtp_port':
                    try:
                        settings_dict[key] = int(value)
                    except ValueError:
                        settings_dict[key] = 587  # Default
                else:
                    settings_dict[key] = value
            else:
                missing_vars.append(var)
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            logger.error(f"Available env vars: {env_keys[:20]}...")  # First 20 for debugging
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        # Add optional vars
        if 'ENVIRONMENT' in os.environ:
            settings_dict['environment'] = os.environ['ENVIRONMENT']
        if 'CORS_ORIGINS' in os.environ:
            settings_dict['cors_origins'] = os.environ['CORS_ORIGINS']
        if 'API_PREFIX' in os.environ:
            settings_dict['api_prefix'] = os.environ['API_PREFIX']
        
        # Create Settings from dict
        return Settings(**settings_dict)

settings = load_settings()

