from pydantic import BaseModel


class TemplateRead(BaseModel):
    value: str
    label: str
    description: str

    model_config = {"from_attributes": True}
