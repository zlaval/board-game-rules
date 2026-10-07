"""Choose a usable CUDA device and retry failed GPU conversion on CPU once."""

import gc
import json
import logging
import os
import sys

log = logging.getLogger(__name__)


def cuda_available() -> bool:
    try:
        import torch

        if not torch.cuda.is_available():
            return False
        # Driver visibility alone does not guarantee that this wheel can run kernels.
        probe = torch.ones(1, device="cuda:0") + 1
        torch.cuda.synchronize()
        del probe
        return True
    except Exception:
        log.warning("CUDA probe failed; using CPU", exc_info=True)
        return False


def select_device() -> str:
    mode = os.environ.get("PROCESSING_DEVICE", "auto").lower()
    if mode not in {"auto", "cpu"}:
        raise ValueError("PROCESSING_DEVICE must be auto or cpu")
    return "cuda:0" if mode == "auto" and cuda_available() else "cpu"


def release_cuda():
    gc.collect()
    try:
        import torch

        torch.cuda.empty_cache()
    except Exception:
        log.warning("Could not release CUDA cache", exc_info=True)


def convert_with_fallback(convert, output):
    device = select_device()
    fallback = False
    print(f"Document processing device: {device}", flush=True)
    try:
        result = convert(device)
    except Exception:
        if device == "cpu":
            raise
        log.warning("GPU conversion failed; retrying once on CPU", exc_info=True)
        fallback = True
    if fallback:
        # Leave the exception scope first so its traceback releases the GPU pipeline.
        release_cuda()
        device = "cpu"
        result = convert(device)
    (output / "acceleration.json").write_text(
        json.dumps(
            {
                "device": device,
                "ocr_backend": "torch" if device != "cpu" else "onnxruntime",
                "cpu_fallback": fallback,
            }
        ),
        encoding="utf-8",
    )
    return result


if __name__ == "__main__":
    # Used by the Compose launchers before requesting GPUs for the long-lived worker.
    sys.exit(0 if cuda_available() else 1)
