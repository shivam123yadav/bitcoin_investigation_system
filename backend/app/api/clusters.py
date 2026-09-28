from fastapi import APIRouter, HTTPException
from app.services.analysis import analysis_service
router=APIRouter(prefix='/api/v1/clusters')
@router.get('')
def clusters(): return analysis_service.get_state().clusters
@router.get('/{cluster_id}')
def cluster(cluster_id:str):
    for x in analysis_service.get_state().clusters:
        if x['id']==cluster_id:return x
    raise HTTPException(404,'Cluster not found')
