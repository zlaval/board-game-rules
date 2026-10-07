import json
import re
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import JSONResponse

CATALOGS = {
    language: json.loads(
        (Path(__file__).parent / "locales" / f"{language}.json").read_text("utf-8")
    )
    for language in ("en", "hu")
}


def request_language(request):
    choices = []
    for index, item in enumerate(request.headers.get("accept-language", "en").split(",")):
        parts = item.strip().lower().split(";")
        language = parts[0].split("-")[0]
        quality = 1.0
        try:
            for part in parts[1:]:
                if part.strip().startswith("q="):
                    quality = float(part.strip()[2:])
        except ValueError:
            continue
        if language in CATALOGS and 0 < quality <= 1:
            choices.append((quality, -index, language))
    return max(choices)[2] if choices else "en"


def message(key, language, params=None):
    return (
        CATALOGS[language]
        .get(key, CATALOGS["en"]["errors.request_failed"])
        .format(**(params or {}))
    )


def api_error(status, code, **params):
    return HTTPException(status, {"code": code, "params": params})


def error_response(request, status, code, params=None, headers=None):
    language = request_language(request)
    return JSONResponse(
        {
            "detail": message(f"errors.{code}", language, params),
            "code": code,
            "params": params or {},
        },
        status_code=status,
        headers={**(headers or {}), "Content-Language": language, "Vary": "Accept-Language"},
    )


def normalize(value, prefix):
    if not value:
        return None, {}
    device = re.search(r" \((cpu|cuda(?::\d+)?)\)$", value)
    base = value[: device.start()] if device else value
    params = {"device": device.group(1)} if device else {}
    for language in CATALOGS.values():
        for key, text in language.items():
            if key.startswith(prefix + ".") and (base == text or base == key.split(".", 1)[1]):
                return key.split(".", 1)[1], params
    return ("processing" if prefix == "stages" else "processing_failed"), params


def localize_version(row, language):
    result = dict(row)
    stage, params = normalize(row.get("stage"), "stages")
    error, _ = normalize(row.get("error"), "errors")
    result.update(stage_code=stage, stage_params=params, error_code=error)
    if stage:
        result["stage"] = message(f"stages.{stage}", language)
        if params:
            result["stage"] += f" ({params['device']})"
    if error:
        result["error"] = message(f"errors.{error}", language)
    return result
