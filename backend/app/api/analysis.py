from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_api_token
from app.services.analysis import AnalysisError, analysis_service

router=APIRouter(prefix='/api/v1/analysis')

@router.get('/stages')
def stages(): return analysis_service.status()['stages']

@router.get('/result')
def result():
    try: return analysis_service.get_state().summary | {'stages':analysis_service.get_state().stages}
    except AnalysisError as e: raise HTTPException(500,str(e)) from e

# State-changing: runs the full analysis pipeline, so it requires the API token.
# When a valid precomputed state was restored at startup (e.g. Railway image
# ships backend/data/runs/latest.json + parquet artifacts), reuse it instead
# of forcing a memory-heavy full recompute. Local dev without cached state
# still runs the full pipeline.
@router.post('/run', dependencies=[Depends(require_api_token)])
def run():
    try:
        current = analysis_service.status()
        if current.get('status') == 'completed' and current.get('stages'):
            return current['stages']
        s=analysis_service.run(force=True)
        return s.stages
    except AnalysisError as e: raise HTTPException(500,str(e)) from e

@router.get('/status')
def status(): return analysis_service.status()
