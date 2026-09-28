from fastapi import APIRouter, HTTPException
import duckdb
from app.services.analysis import analysis_service
from app.services.api_data import dataset_meta,dataset_stats,field_quality,preview,wallet_to_frontend,ip_to_frontend
from app.services.graph import GraphService, EntityNotFoundError
from app.services.paths import NORMALIZED_STORAGE_ROOT

router=APIRouter(prefix='/api/v1')
graph=GraphService()

@router.get('/dataset/meta')
def meta(): return dataset_meta()
@router.get('/dataset/stats')
def stats(): return dataset_stats()
@router.get('/dataset/quality')
def quality(): return field_quality()
@router.get('/dataset/preview')
def dataset_preview(page:int=1,pageSize:int=10): return preview(page,pageSize)

@router.get('/entities/wallets')
def wallets(): return [wallet_to_frontend(x) for x in analysis_service.get_state().wallet_features.entity_id.tolist()]
@router.get('/entities/wallet/{id}')
def wallet(id:str):
 x=wallet_to_frontend(id)
 if x is None: raise HTTPException(404,'Wallet not found')
 return x
@router.get('/entities/ip/{id}')
def ip(id:str):
 x=ip_to_frontend(id)
 if x is None: raise HTTPException(404,'IP not found')
 return x
@router.get('/entities/ips')
def ips(): return [ip_to_frontend(x) for x in analysis_service.get_state().ip_features.entity_id.tolist()]
@router.get('/entities/{entity_id}/evidence')
def evidence(entity_id:str): return analysis_service.get_state().evidence.get(entity_id,[])
@router.get('/entities/{entity_id}/indicators')
def indicators(entity_id:str):
 s=analysis_service.get_state(); r=s.wallet_features[s.wallet_features.entity_id==entity_id]
 if r.empty:return []
 x=r.iloc[0]
 vals=[('Transaction velocity',min(float(x.transactions_per_day)/50,1)),('Network diversity',min(int(x.unique_ip_count)/5,1)),('Amount activity',min(float(x.total_volume)/100,1))]
 return [{'label':a,'value':round(v,3),'deviation':round(v,3),'status':'anomalous' if v>.7 else 'elevated' if v>.45 else 'normal'} for a,v in vals]
@router.get('/entities/{entity_id}/findings')
def findings(entity_id:str): return analysis_service.get_state().findings.get(entity_id,[])
@router.get('/entities/{entity_id}/timeline')
def timeline(entity_id:str): return analysis_service.get_state().timelines.get(entity_id,[])

@router.get('/transactions')
def transactions():
 s=analysis_service.get_state(); g=graph.get_graph(); out=[]
 for n,a in g.nodes(data=True):
  if a.get('type')!='transaction':continue
  out.append({'id':a.get('txid',a.get('entity_id')),'txid':a.get('txid',a.get('entity_id')),'timestamp':a.get('first_seen'),'amount':float(sum(a.get('output_amounts',[]))),'fee':a.get('fee',0),'scriptType':a.get('script_type'),'inputAddresses':list(a.get('input_wallets',[])),'outputAddresses':list(a.get('output_wallets',[])),'srcIp':(a.get('src_ips') or [''])[0],'dstIp':(a.get('dst_ips') or [''])[0],'srcPort':(a.get('src_ports') or [0])[0],'dstPort':(a.get('dst_ports') or [0])[0],'anomalyScore':0,'relatedWallets':list(set(a.get('input_wallets',[]))|set(a.get('output_wallets',[])))})
  if len(out)>=500:break
 return out
@router.get('/transactions/flow-patterns')
def flow_patterns(): return analysis_service.get_state().flow_patterns
@router.get('/search')
def search(q:str=''):
 if not q.strip(): return []
 q=q.lower(); s=analysis_service.get_state(); out=[]
 for x in s.leads:
  if q in x['entityId'].lower() or q in x['entityLabel'].lower() or q in x.get('clusterId','').lower(): out.append({'id':x['entityId'],'label':x['entityLabel'],'type':x['type'],'description':'Investigative lead'})
 for x in s.patterns[:50]:
  if q in x['id'].lower() or q in x['description'].lower(): out.append({'id':x['id'],'label':x['id'],'type':'transaction','description':x['description']})
 return out[:30]

