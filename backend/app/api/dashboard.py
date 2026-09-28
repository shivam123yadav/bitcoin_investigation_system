from fastapi import APIRouter
from app.services.analysis import analysis_service
from app.services.api_data import dataset_stats, ip_to_frontend, wallet_to_frontend
from collections import Counter

router=APIRouter(prefix='/api/v1/dashboard')

@router.get('/stats')
def stats():
 s=analysis_service.get_state(); ds=dataset_stats()
 return {'transactions':s.summary['transactionsAnalyzed'],'wallets':s.summary['entitiesAnalyzed']-len(s.ip_features),'ips':len(s.ip_features),'clusters':len(s.clusters),'leads':len(s.leads)}

@router.get('/priority-distribution')
def priority():
 c=Counter(x['priority'] for x in analysis_service.get_state().leads)
 return {'high':c.get('high',0),'medium':c.get('medium',0),'low':c.get('low',0)}

@router.get('/top-leads')
def top(limit:int=5): return analysis_service.get_state().leads[:max(1,min(limit,50))]

@router.get('/geo')
def geo():
 s=analysis_service.get_state(); c=Counter(country for vals in s.wallet_features.countries for country in vals)
 return [{'country':k,'code':k,'transactions':v,'wallets':v,'ips':0,'risk':'high' if v>1000 else 'medium' if v>300 else 'low'} for k,v in c.most_common(15)]

@router.get('/timeline')
def timeline():
 s=analysis_service.get_state();
 buckets=analysis_service.load_observations(s.dataset_version).assign(day=lambda x:x.timestamp_dt.dt.strftime('%Y-%m-%d')).groupby('day').size()
 return [{'label':k,'transactions':int(v),'anomalies':0} for k,v in buckets.items()]

@router.get('/recent-activity')
def recent():
 s=analysis_service.get_state(); return [{'id':x['leadId'],'action':x['signals'][0] if x['signals'] else 'Observed activity','entity':x['entityId'],'time':x['lastActivity'],'type':'lead'} for x in s.leads[:12]]

@router.get('/system')
def system():
 s=analysis_service.get_state(); return [{'name':'Dataset ingestion','status':'operational','detail':f"{s.summary['recordsProcessed']:,} records loaded",'version':s.dataset_version},{'name':'Correlation engine','status':'operational','detail':'IP, transaction and wallet relationships built','version':'1.0.0'},{'name':'Anomaly detection','status':'operational','detail':'Isolation Forest completed','version':'1.0.0'},{'name':'Clustering','status':'operational','detail':f"{len(s.clusters)} clusters",'version':'1.0.0'},{'name':'Pattern detection','status':'operational','detail':f"{len(s.patterns)} candidates",'version':'1.0.0'}]
