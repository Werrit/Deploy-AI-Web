"""Start the web UI and model API on one port (legacy entrypoint name)."""
import os

import uvicorn


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "7860")))
