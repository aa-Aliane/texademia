from pydantic import BaseModel


class ProfileRead(BaseModel):
    headline: str | None = None
    bio: str | None = None
    picture_url: str | None = None
    phone_number: str | None = None
    location: str | None = None
    driving_license: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    tier: str

    model_config = {"from_attributes": True}


class ProfileCreate(BaseModel):
    headline: str | None = None
    bio: str | None = None
    picture_url: str | None = None
    phone_number: str | None = None
    location: str | None = None
    driving_license: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    tier: str = "Free"


class ProfileUpdate(BaseModel):
    headline: str | None = None
    bio: str | None = None
    picture_url: str | None = None
    phone_number: str | None = None
    location: str | None = None
    driving_license: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
