import asyncio
from app.agents.invoice_agent import _extract_json

text = """```json
{
  "action": "create",
  "data": {
    "docNumber": "260614",
    "lines": [
      {
        "description": "tools",
        "quantity": 1,
        "unitPrice": 500
      },
      {
        "description": "item 2",
        "quantity": 2,
        "unitPrice": 550
      },
      {
        "description": "item 3",
        "quantity": 2,
        "unitPrice": 550
      }
    ]
  }
}
```"""
print(_extract_json(text))
